"""Read this pack's diagnostic value from Chromium's LevelDB write log.

Only the named diagnostic key is returned; cookies and account data are ignored.
"""
import json
import os
import struct
from pathlib import Path


def varint(data, offset):
    result = shift = 0
    while offset < len(data):
        byte = data[offset]
        offset += 1
        result |= (byte & 127) << shift
        if byte < 128:
            return result, offset
        shift += 7
    raise ValueError("Truncated varint")


def records(data):
    partial = b""
    offset = 0
    while offset + 7 <= len(data):
        remaining = 32768 - offset % 32768
        if remaining < 7:
            offset += remaining
            continue
        _, length, kind = struct.unpack_from("<IHB", data, offset)
        offset += 7
        fragment = data[offset:offset + length]
        offset += length
        if kind == 1:
            yield fragment
        elif kind == 2:
            partial = fragment
        elif kind == 3:
            partial += fragment
        elif kind == 4:
            yield partial + fragment
            partial = b""
        elif length == 0:
            offset += 32768 - offset % 32768


def main():
    latest = None
    latest_sequence = -1
    root = Path(os.environ["LOCALAPPDATA"]) / "Spotify/Browser/Local Storage/leveldb"
    for file in root.glob("*.log"):
        for record in records(file.read_bytes()):
            if len(record) < 12:
                continue
            sequence, count = struct.unpack_from("<QI", record)
            offset = 12
            for index in range(count):
                tag = record[offset]
                offset += 1
                size, offset = varint(record, offset)
                key = record[offset:offset + size]
                offset += size
                if tag != 1:
                    continue
                size, offset = varint(record, offset)
                value = record[offset:offset + size]
                offset += size
                if b"spotify-plugin-diagnostics" not in key or not value:
                    continue
                if sequence + index <= latest_sequence:
                    continue
                encoding = "utf-16-le" if value[0] == 0 else "latin-1"
                try:
                    latest = json.loads(value[1:].decode(encoding))
                    latest_sequence = sequence + index
                except (UnicodeError, ValueError):
                    continue
    print(json.dumps(latest, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
