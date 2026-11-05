#!/usr/bin/env python3
"""Render an SVG line chart from a CSV — Python standard library only.

This is the reference entry point for user code in the VizMaster workspace.
Copy it next to your own scripts rather than editing it in place.

Usage:
    python3 svg_line_chart.py DATA.csv X_COLUMN Y_COLUMN [SERIES_COLUMN] > chart.svg

Example (against the bundled template dataset):
    python3 svg_line_chart.py \
        ../../templates/analysis-report/data/sample-sales.csv \
        month revenue_usd region > figures/fig1-revenue-by-region.svg

Aggregates duplicate (x, series) rows by SUM so monthly grain works with
raw transaction data as well as pre-aggregated tables.
"""

from __future__ import annotations

import csv
import math
import sys
from collections import defaultdict
from datetime import datetime

WIDTH, HEIGHT = 800, 480
MARGIN = {"left": 80, "right": 30, "top": 50, "bottom": 60}
PALETTE = ["#4c6ef5", "#12b886", "#e8590c", "#ae3ec9", "#1098ad"]
X_LABELS_MAX = 12  # thin out x labels beyond this many ticks


def fail(message: str) -> None:
    sys.stderr.write(f"error: {message}\n")
    sys.exit(1)


def parse_value(raw: str) -> float:
    try:
        return float(raw)
    except ValueError:
        fail(f"non-numeric value {raw!r} in the y column; run the data-hygiene pass first")


def parse_x(raw: str) -> tuple[str, float]:
    """Return (sortable key, display label) for the x column."""
    for fmt in ("%Y-%m", "%Y-%m-%d", "%Y/%m/%d"):
        try:
            dt = datetime.strptime(raw, fmt)
            return (dt.strftime("%Y%m%d%H%M"), dt.strftime("%b %Y" if fmt == "%Y-%m" else "%Y-%m-%d"))
        except ValueError:
            continue
    try:
        return (f"{float(raw):015.4f}", raw)
    except ValueError:
        return (raw, raw)


def nice_ticks(low: float, high: float, count: int = 5) -> list[float]:
    if low == high:
        return [low]
    span = high - low
    step = 10 ** math.floor(math.log10(span / count))
    for multiple in (1, 2, 2.5, 5, 10):
        candidate = step * multiple
        if span / candidate <= count:
            break
    start = math.floor(low / candidate) * candidate
    return [start + i * candidate for i in range(int((high - start) / candidate) + 1)]


def main() -> None:
    if len(sys.argv) not in (4, 5):
        fail("usage: svg_line_chart.py DATA.csv X_COLUMN Y_COLUMN [SERIES_COLUMN]")

    path, x_col, y_col = sys.argv[1], sys.argv[2], sys.argv[3]
    series_col = sys.argv[4] if len(sys.argv) == 5 else None

    totals: dict[tuple[str, str], float] = defaultdict(float)
    labels: dict[str, str] = {}
    series_names = set()

    with open(path, newline="", encoding="utf-8-sig") as fh:
        reader = csv.DictReader(fh)
        if reader.fieldnames is None or x_col not in reader.fieldnames or y_col not in reader.fieldnames:
            fail(f"columns {x_col!r}/{y_col!r} not in header: {reader.fieldnames}")
        if series_col is not None and series_col not in reader.fieldnames:
            fail(f"series column {series_col!r} not in header: {reader.fieldnames}")
        for row in reader:
            key, label = parse_x(row[x_col])
            labels[key] = label
            series = row[series_col] if series_col else ""
            series_names.add(series)
            totals[(key, series)] += parse_value(row[y_col])

    if not totals:
        fail("no data rows found")

    xs = sorted(labels)
    if not xs:
        fail("no x values parsed")
    series = sorted(series_names)
    ys = list(totals.values())
    y_min, y_max = min(ys), max(ys)
    if y_min > 0 and (y_max - y_min) / max(y_max, 1) < 0.05:
        y_min = 0  # near-flat data: keep the zero baseline instead of a cliff

    plot_w = WIDTH - MARGIN["left"] - MARGIN["right"]
    plot_h = HEIGHT - MARGIN["top"] - MARGIN["bottom"]

    def px(i: int) -> float:
        return MARGIN["left"] + (plot_w * i / max(len(xs) - 1, 1))

    def py(v: float) -> float:
        span = (y_max - y_min) or 1.0
        return MARGIN["top"] + plot_h * (1 - (v - y_min) / span)

    out = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" '
               f'viewBox="0 0 {WIDTH} {HEIGHT}" font-family="system-ui, sans-serif">')
    out.append(f'<rect width="{WIDTH}" height="{HEIGHT}" fill="#ffffff"/>')
    out.append(f'<text x="{MARGIN["left"]}" y="24" font-size="16" font-weight="600" fill="#1a1a2e">'
               f'{y_col} by {x_col}' + (f' ({series_col})' if series_col else "") + "</text>")

    for tick in nice_ticks(y_min, y_max):
        y = py(tick)
        out.append(f'<line x1="{MARGIN["left"]}" y1="{y:.1f}" x2="{WIDTH - MARGIN["right"]}" '
                   f'y2="{y:.1f}" stroke="#dee2e6" stroke-width="1"/>')
        out.append(f'<text x="{MARGIN["left"] - 8}" y="{y + 4:.1f}" font-size="11" fill="#495057" '
                   f'text-anchor="end">{tick:g}</text>')

    step = max(1, -(-len(xs) // X_LABELS_MAX))
    for i, key in enumerate(xs):
        x = px(i)
        out.append(f'<line x1="{x:.1f}" y1="{HEIGHT - MARGIN["bottom"]}" x2="{x:.1f}" '
                   f'y2="{HEIGHT - MARGIN["bottom"] + 5}" stroke="#495057"/>')
        if i % step == 0:
            out.append(f'<text x="{x:.1f}" y="{HEIGHT - MARGIN["bottom"] + 20}" font-size="11" '
                       f'fill="#495057" text-anchor="middle">{labels[key]}</text>')

    out.append(f'<text x="{MARGIN["left"] + plot_w / 2:.0f}" y="{HEIGHT - 12}" font-size="12" '
               f'fill="#1a1a2e" text-anchor="middle">{x_col}</text>')
    out.append(f'<text x="18" y="{MARGIN["top"] + plot_h / 2:.0f}" font-size="12" fill="#1a1a2e" '
               f'text-anchor="middle" transform="rotate(-90 18 {MARGIN["top"] + plot_h / 2:.0f})">{y_col}</text>')

    for s_index, name in enumerate(series):
        color = PALETTE[s_index % len(PALETTE)]
        points = [(px(i), py(totals[(key, name)])) for i, key in enumerate(xs) if (key, name) in totals]
        if len(points) < 2:
            continue
        poly = " ".join(f"{x:.1f},{y:.1f}" for x, y in points)
        out.append(f'<polyline points="{poly}" fill="none" stroke="{color}" stroke-width="2.5" '
                   f'stroke-linejoin="round" stroke-linecap="round"/>')
        lx, ly = points[-1]
        out.append(f'<text x="{min(lx + 6, WIDTH - MARGIN["right"] - 4):.1f}" y="{ly + 4:.1f}" '
                   f'font-size="11" fill="{color}" font-weight="600">{name or y_col}</text>')

    out.append(f'<line x1="{MARGIN["left"]}" y1="{HEIGHT - MARGIN["bottom"]}" '
               f'x2="{WIDTH - MARGIN["right"]}" y2="{HEIGHT - MARGIN["bottom"]}" '
               f'stroke="#495057" stroke-width="1.5"/>')
    out.append("</svg>")
    print("\n".join(out))


if __name__ == "__main__":
    main()
