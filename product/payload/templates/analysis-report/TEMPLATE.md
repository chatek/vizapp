# Analysis report: <one-line question>

Copy this folder, rename it to your project (e.g. `reports/q3-churn/`), and
replace every section below. Delete this paragraph when you start.

- **Question:** what decision does this report inform?
- **Owner:** who asked, and who acts on the answer.
- **Data:** `data/<your-dataset>` (original, never modified in place).

## 1 · Findings first

State the answer in three bullets, before any chart. Each bullet must be
traceable to a figure below. If you cannot write this section yet, you are not
ready to draw.

## 2 · Data

- Source and retrieval date.
- Row/column counts after each filter, so the reader can audit the funnel.
- Known gaps: nulls, unrepresentative periods, unit inconsistencies
  (see the `data-hygiene` skill for what to check).

## 3 · Figures

One question per figure. For each, record:

| figure | file | produced by | answers |
|---|---|---|---|
| 1 | `figures/fig1-monthly-revenue.svg` | `code/revenue_by_month.py` | is revenue trending? |

`figures/fig1-<slug>.<ext>` naming keeps the report rebuildable. Regenerate
every figure from its script before delivery — never hand-edit an output.

## 4 · Method notes

Aggregation choices, exclusions, and anything a skeptic would ask about.
If you summed, say over what; if you averaged, say of what.

## 5 · Caveats and next questions

What this report does *not* establish, and the follow-up question worth asking.

---

The bundled `data/sample-sales.csv` (24 rows: monthly units, revenue, and
returns for two products across two regions) exists so you can rehearse the
workflow end-to-end before your real data arrives. Run
`code/examples/svg_line_chart.py` against it for a working first figure.
