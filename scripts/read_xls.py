"""Read an old binary Excel (.xls, BIFF8) file with the Python standard library only.

Usage: python -I scripts/read_xls.py <file.xls> [out.json]

Writes {"sheets": [{"name", "cells": {"A1": value, ...}}]}. It reads cell values only
(numbers, text, cached formula results, booleans); it never runs anything in the file.
The file is untrusted data: this script only parses bytes.
"""
import json
import struct
import sys

FREESECT, ENDOFCHAIN = 0xFFFFFFFF, 0xFFFFFFFE


def cfb_stream(data, wanted=("Workbook", "Book")):
    """Return the bytes of the Workbook stream from an OLE2 compound file."""
    if data[:8] != b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1":
        raise ValueError("not an OLE2 compound file")
    ssz = 1 << struct.unpack_from("<H", data, 30)[0]
    msz = 1 << struct.unpack_from("<H", data, 32)[0]
    n_fat, dir_start, cutoff, mini_start, n_mini, difat_start, n_difat = struct.unpack_from(
        "<I I 4x I I I I I", data, 44)
    sec = lambda i: data[(i + 1) * ssz:(i + 2) * ssz]
    difat = list(struct.unpack_from("<109I", data, 76))
    d = difat_start
    for _ in range(n_difat):
        if d in (FREESECT, ENDOFCHAIN):
            break
        s = sec(d)
        vals = struct.unpack_from(f"<{ssz // 4}I", s)
        difat += vals[:-1]
        d = vals[-1]
    fat = []
    for f in difat[:n_fat]:
        fat += struct.unpack_from(f"<{ssz // 4}I", sec(f))

    def chain(start, table):
        out, i, seen = [], start, set()
        while i not in (FREESECT, ENDOFCHAIN) and i < len(table) and i not in seen:
            seen.add(i)
            out.append(i)
            i = table[i]
        return out

    dirs = b"".join(sec(i) for i in chain(dir_start, fat))
    entries = []
    for k in range(len(dirs) // 128):
        e = dirs[k * 128:(k + 1) * 128]
        nl = struct.unpack_from("<H", e, 64)[0]
        name = e[:max(nl - 2, 0)].decode("utf-16-le", "replace")
        start, size = struct.unpack_from("<I", e, 116)[0], struct.unpack_from("<I", e, 120)[0]
        entries.append((name, e[66], start, size))
    root = entries[0]
    ministream = b"".join(sec(i) for i in chain(root[2], fat))
    minifat = []
    for i in chain(mini_start, fat):
        minifat += struct.unpack_from(f"<{ssz // 4}I", sec(i))
    for name, typ, start, size in entries:
        if typ == 2 and name in wanted:
            if size < cutoff:
                b = b"".join(ministream[i * msz:(i + 1) * msz] for i in chain(start, minifat))
            else:
                b = b"".join(sec(i) for i in chain(start, fat))
            return b[:size]
    raise ValueError("no Workbook stream")


def rk(v):
    if v & 2:
        n = v >> 2
        if n & (1 << 29):
            n -= 1 << 30
        x = float(n)
    else:
        x = struct.unpack("<d", struct.pack("<Q", (v & 0xFFFFFFFC) << 32))[0]
    return x / 100 if v & 1 else x


def col_name(c):
    s = ""
    c += 1
    while c:
        c, r = divmod(c - 1, 26)
        s = chr(65 + r) + s
    return s


class Reader:
    """Reads a BIFF8 string that may continue across CONTINUE records."""

    def __init__(self, chunks):
        self.chunks, self.ci, self.pos = chunks, 0, 0

    def need(self):
        if self.pos >= len(self.chunks[self.ci]):
            self.ci += 1
            self.pos = 0

    def take(self, n):
        out = b""
        while n:
            self.need()
            c = self.chunks[self.ci]
            part = c[self.pos:self.pos + n]
            out += part
            self.pos += len(part)
            n -= len(part)
        return out

    def string(self):
        cch = struct.unpack("<H", self.take(2))[0]
        flags = self.take(1)[0]
        rt = struct.unpack("<H", self.take(2))[0] if flags & 8 else 0
        ext = struct.unpack("<I", self.take(4))[0] if flags & 4 else 0
        wide, chars = flags & 1, []
        while len(chars) < cch:
            self.need()
            c = self.chunks[self.ci]
            if self.pos == 0 and self.ci > 0 and chars:
                wide = c[0] & 1
                self.pos = 1
            avail = len(c) - self.pos
            want = cch - len(chars)
            if wide:
                k = min(want, avail // 2)
                chars += c[self.pos:self.pos + 2 * k].decode("utf-16-le", "replace")
                self.pos += 2 * k
            else:
                k = min(want, avail)
                chars += c[self.pos:self.pos + k].decode("latin-1")
                self.pos += k
            if k == 0:
                self.ci += 1
                self.pos = 0
                if self.ci >= len(self.chunks):
                    break
                c = self.chunks[self.ci]
                wide = c[0] & 1
                self.pos = 1
        self.take(4 * rt)
        self.take(ext)
        return "".join(chars)


def short_string(b, off, cch_bytes=2):
    cch = struct.unpack_from("<H" if cch_bytes == 2 else "<B", b, off)[0]
    off += cch_bytes
    flags = b[off]
    off += 1
    if flags & 1:
        return b[off:off + 2 * cch].decode("utf-16-le", "replace")
    return b[off:off + cch].decode("latin-1")


def read(path):
    wb = cfb_stream(open(path, "rb").read())
    recs, i = [], 0
    while i + 4 <= len(wb):
        t, n = struct.unpack_from("<HH", wb, i)
        recs.append((t, wb[i + 4:i + 4 + n], i))
        i += 4 + n
    sst, sheets, by_offset = [], [], {}
    for k, (t, b, off) in enumerate(recs):
        if t == 0x85:  # BOUNDSHEET
            pos = struct.unpack_from("<I", b, 0)[0]
            name = short_string(b, 6, 1)
            sh = {"name": name, "cells": {}}
            sheets.append(sh)
            by_offset[pos] = sh
        elif t == 0xFC:  # SST
            chunks, j = [b[8:]], k + 1
            while j < len(recs) and recs[j][0] == 0x3C:
                chunks.append(recs[j][1])
                j += 1
            r, total = Reader(chunks), struct.unpack_from("<I", b, 4)[0]
            try:
                for _ in range(total):
                    sst.append(r.string())
            except (IndexError, struct.error):
                pass
    cur, pending_formula = None, None
    for t, b, off in recs:
        if t == 0x809:
            cur = by_offset.get(off)
            continue
        if cur is None:
            continue
        cells = cur["cells"]
        if t in (0x203, 0x27E, 0xFD, 0x204, 0x205, 0x06, 0xBD):
            row, col = struct.unpack_from("<HH", b, 0)
        if t == 0x203:  # NUMBER
            cells[f"{col_name(col)}{row + 1}"] = struct.unpack_from("<d", b, 6)[0]
        elif t == 0x27E:  # RK
            cells[f"{col_name(col)}{row + 1}"] = rk(struct.unpack_from("<I", b, 6)[0])
        elif t == 0xBD:  # MULRK
            last = struct.unpack_from("<H", b, len(b) - 2)[0]
            for c in range(col, last + 1):
                v = struct.unpack_from("<I", b, 4 + (c - col) * 6 + 2)[0]
                cells[f"{col_name(c)}{row + 1}"] = rk(v)
        elif t == 0xFD:  # LABELSST
            idx = struct.unpack_from("<I", b, 6)[0]
            cells[f"{col_name(col)}{row + 1}"] = sst[idx] if idx < len(sst) else None
        elif t == 0x204:  # LABEL
            cells[f"{col_name(col)}{row + 1}"] = short_string(b, 6)
        elif t == 0x205:  # BOOLERR
            cells[f"{col_name(col)}{row + 1}"] = bool(b[6]) if b[7] == 0 else "#ERR"
        elif t == 0x06:  # FORMULA: cached result only
            res = b[6:14]
            ref = f"{col_name(col)}{row + 1}"
            if res[6:8] == b"\xff\xff":
                kind = res[0]
                if kind == 0:
                    pending_formula = (cells, ref)  # text follows in a STRING record
                elif kind == 1:
                    cells[ref] = bool(res[2])
                else:
                    cells[ref] = None
            else:
                cells[ref] = struct.unpack("<d", res)[0]
        elif t == 0x207 and pending_formula:  # STRING (formula text result)
            pending_formula[0][pending_formula[1]] = short_string(b, 0)
            pending_formula = None
    return {"file": path.replace("\\", "/").split("/")[-1], "sheets": sheets}


if __name__ == "__main__":
    out = read(sys.argv[1])
    if len(sys.argv) > 2:
        json.dump(out, open(sys.argv[2], "w", encoding="utf-8"), indent=0, ensure_ascii=False)
    else:
        for sh in out["sheets"]:
            print(sh["name"], len(sh["cells"]), "cells")
