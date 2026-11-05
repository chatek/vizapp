---
name: data-hygiene
description: Profile and sanity-check a dataset before any chart is drawn. Use whenever new data arrives or a report starts: schema, nulls, units, cardinality, aggregation traps.
---

# Data hygiene before visualization

Every chart inherits the sins of its data. This skill is the mandatory pass
between "here is a file" and "here is a figure".

## 1 · Establish the shape

Before plotting anything, know and write down:

- **Row count and column count**, plus row count after every filter you apply.
- **Column types** — and whether the *declared* type matches reality (a numeric
  column stored as text, an ISO date column with one `4/13/25` in row 902).
- **Grain** — what one row represents. "One order" and "one order line" produce
  different totals for the same column. If you cannot state the grain, stop.
- **Time coverage** — first and last timestamp, gaps, and whether the series is
  complete at its own cadence.

## 2 · Profile every column you will encode

- **Numeric:** min, max, median, and unit. Flag impossible values (negative
  ages, revenue in cents mixed with dollars).
- **Categorical:** distinct count and the top values. A "region" column with
  `North`, `NORTH`, and `north` is three categories in your legend.
- **Nulls:** count and pattern. Distinguish missing-at-random from
  structurally missing (a `returns` column that is empty because no returns
  occurred is zero, not null — decide and record the decision).
- **Free text:** length distribution and a sample; never encode it directly
  without classifying first.

## 3 · Aggregation traps

- **Simpson's reversal:** a trend visible in every subgroup can reverse in the
  total (and vice versa). Check the subgroups before claiming a total trend.
- **Averaging averages:** a mean of group means is wrong unless groups are
  equal-sized. Recompute from the underlying grain.
- **Survivorship:** rows that dropped out between periods quietly change the
  population. Name the denominator.
- **Double counting:** joins multiply rows. Verify the grain survived the join
  by re-counting a known total.

## 4 · Record it

Every report gets a short data section: source, retrieval date, row-count
funnel, and the decisions made about nulls and units. This is what lets a
skeptic reconcile your numbers — and it is the section that earns trust in
everything above it.
