---
name: chart-craft
description: Choose chart types, encodings, and scales that tell the truth. Use when designing or drawing any chart, from a one-off figure to a dashboard tile.
---

# Chart craft

## 1 · The type follows the question

| question about… | use | avoid |
|---|---|---|
| comparison between categories | bar | pie, donut |
| change over time | line (few series), bar (periods) | stacked area with >3 series |
| part-to-whole (2–3 parts) | stacked bar or single bar | pie with >3 slices |
| relationship between two measures | scatter | dual-axis line |
| distribution | histogram, box, strip | bar of min/mean/max only |
| single value vs. a target | bullet | gauge |

Dual y-axes are banned unless the owner explicitly demands them: they invite
spurious correlation. Use two stacked panels with aligned x instead.

## 2 · Encoding discipline

- **Position and length** are read precisely; **angle, area, and color** are
  read coarsely. Spend the precise channels on the message.
- **Color encodes category or a single ordered scale — never both.** Categorical
  palettes have no implied order; sequential scales do. Use the wrong one and
  readers invent an order that isn't there.
- **One highlight color maximum** per chart. If everything is highlighted,
  nothing is.
- Sort bars by value (or by the question's natural order, e.g. time); never
  leave them in row order.
- Start bar-chart y-axes at zero. Line charts may zoom, but then label the
  truncated range on the axis so it cannot be missed.

## 3 · Labels beat legends

Direct labeling on the line/bar beats a legend the reader must ping-pong
between. Title states the takeaway ("Returns eat 3% of revenue and rising"),
not the column names ("returns_usd vs revenue_usd"). Every axis gets a unit.

## 4 · Rendering

- Prefer vector output (SVG) for line/bar charts; it stays sharp at any size.
- `code/examples/svg_line_chart.py` renders an SVG line chart from CSV with
  the Python standard library only — copy it as the starting point for
  one-off figures so no environment setup blocks the analysis.
- Re-render every figure from its script before delivery; never hand-edit
  output files.

## 5 · Honesty checklist

Before shipping a chart, verify:

1. The numbers on screen reconcile with a query on the source data.
2. The y-axis treatment (zero-baseline or labeled truncation) matches rule 2.
3. Nothing in the rendering implies precision the data lacks (no 7-decimal
   labels on estimates; no smooth curves through sparse points suggesting
   interpolated data).
4. A hostile reader flipping it upside down finds nothing deceptive — only
   a defensible design choice.
