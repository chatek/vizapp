# Dashboard brief: <dashboard name>

Write this brief *before* building. A dashboard built without an agreed brief
becomes a wall of charts nobody trusts. Copy this file into your project,
fill it in, and get the owner's sign-off on the "Tiles" table first.

## 1 · Purpose

- **One sentence:** this dashboard exists so that <role> can <decision> every <cadence>.
- **Not for:** explicitly out-of-scope questions (write them down; they will come up).

## 2 · Audience and cadence

Who opens it, how often, on what device (wall display / laptop / phone), and
how much time they spend per visit. A wall-display dashboard tolerates four
tiles; an analyst's deep-dive page tolerates twelve.

## 3 · Tiles

| # | tile title (a question) | chart type | data source | filter / grain | refresh |
|---|---|---|---|---|---|
| 1 | "Is revenue on plan this month?" | bullet | sales table, monthly | current FY | daily |

Rules:

- Every tile title is a question in plain words, not a metric name.
  "Revenue" is not a title; "Is revenue on plan?" is.
- Default time range and comparison (vs. last period, vs. target) are part of
  the tile spec, not afterthoughts.
- If a tile needs a paragraph of explanation to read, it is two tiles.

## 4 · Definitions

Metric dictionary for every number on screen — numerator, denominator, time
window, and exclusion rules. Two tiles showing "revenue" with different
definitions destroy the whole dashboard's credibility.

## 5 · Acceptance

The dashboard is done when: every tile matches this brief, every number in a
tile reconciles with a query the owner can run themselves, and the definitions
section covers every metric on screen.
