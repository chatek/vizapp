---
name: viz-review
description: Review a finished chart or dashboard before delivery. Use when a figure is "done": accuracy, encoding, labeling, and the report's traceability.
---

# Visualization review

The chart is drawn; now prove it deserves delivery. Review in this order —
stop at the first failed gate and fix before continuing.

## Gate 1 · Accuracy

- Pick one or two visible values and reconcile them against the source data
  by hand (a query, not the plotting code — the code and the chart can be
  wrong together).
- Confirm the row-count funnel: does the figure include the rows the report
  claims it includes, after the stated filters?
- Check axis ranges for accidental truncation and pie/stacked totals that
  quietly stop summing to 100% because of nulls.

## Gate 2 · Encoding

- Does the chart type match the question (see the `chart-craft` table)?
- Is the most important comparison encoded in the most precisely-read channel
  (position, then length)?
- Are colors doing exactly one job — category or order, not both?
- Dual axes present? Justify or split.

## Gate 3 · Readability

- Title states the takeaway; axes carry units; direct labels replace legends
  where possible.
- Works in grayscale print and at the delivery size (a wall tile, a phone).
- Nothing decorative is load-bearing: no 3D, no drop shadows, no gradient
  fills carrying meaning.

## Gate 4 · Traceability

- The figure's caption or the report's figure table names the producing
  script and input file.
- Re-running that script regenerates byte-equivalent output (or the diff is
  explained by an input change you can name).

## Verdict

Report gates passed, not adjectives: "reconciled fig 2 against November
(412 units, matched); truncation labeled; grayscale-safe" — not "looks good".
A chart that fails Gate 1 is not a style problem; send it back to the data.
