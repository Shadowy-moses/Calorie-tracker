#!/usr/bin/env python3
"""Draw the home-screen icon: a cream progress ring on green."""

import math
import struct
import zlib
from pathlib import Path

GREEN = (27, 107, 69)
CREAM = (244, 239, 230)
WHITE = (255, 253, 248)
ROOT = Path(__file__).resolve().parents[1] / "public" / "icons"


def clamp(v):
    return 0.0 if v < 0 else 1.0 if v > 1 else v


def mix(a, b, t):
    t = clamp(t)
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def write_png(path, size, pixel):
    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            r, g, b = pixel(x + 0.5, y + 0.5, size)
            raw.extend((r, g, b, 255))

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", ihdr)
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    path.write_bytes(png)


def icon_pixel(x, y, size):
    cx = cy = size / 2
    dx, dy = x - cx, y - cy
    dist = math.hypot(dx, dy)
    radius = size * 0.292
    half = size * 0.03
    aa = 1.25
    ring = clamp(half + aa - abs(dist - radius))
    ang = math.atan2(dx, -dy)
    if ang < 0:
        ang += math.tau
    sweep = 0.72 * math.tau

    def cap(theta):
        px = cx + math.sin(theta) * radius
        py = cy - math.cos(theta) * radius
        return clamp(half + aa - math.hypot(x - px, y - py))

    progress = ring if ang <= sweep else 0.0
    progress = max(progress, cap(0.0), cap(sweep))
    track = ring * (1 - progress)
    color = mix(GREEN, WHITE, track * 0.4)
    color = mix(color, CREAM, progress)
    return color


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, size in (("icon-512.png", 512), ("icon-192.png", 192), ("apple-touch-icon.png", 180)):
        write_png(ROOT / name, size, icon_pixel)
        print(f"wrote {name}")


if __name__ == "__main__":
    main()
