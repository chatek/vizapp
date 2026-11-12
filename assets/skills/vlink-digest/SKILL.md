---
name: vlink-digest
description: Answer the VLink GPIO18 summon with one kid-voice line on the ticker, and give the on-demand daily summary (NEEDS YOU / RUNNING / DUE TODAY / last said). Use when the widget asks for you or the user wants to know about today.
---

# VLink digest

## The GPIO18 summon

A short press on GPIO18 asks the host for a digest; the host turns it into an
agent-facing request, and your reply comes back as an `event` — the widget shows its
`ask` face with your line on the ticker for at least 5 s. So the reply is ONE line, kid
voice, short enough for a ticker, e.g. "> 2 things need you · all fine". No lists, no
jargon, no ids.

## The daily summary — "today" in words

Build it from session records, then say it in care-words:

- NEEDS YOU — sessions waiting on you: "2 waiting" or "0 · all clear"
- RUNNING — running sessions and context use: "1 · brain 62%" (brain % = context usage)
- DUE TODAY — scheduled runs: "2 done", or "2 done · 1 failed"
- last said — your own latest message: '> said: "all green · 3 pass"'

Nothing yet today: "nothing yet today". All clear: "all quiet · go play".

Honesty: these four facts only. The app has no costs, streaks, or graphs — never invent
them.

## Page push — [needs-code]

The wire contract has a `render` zone `"page"` for painting the pets / roads / today /
adopt screens (up to 4 rows, key + ≤ 24-char value + green/amber/dim tone), but the host
bridge does not yet send page renders. Do NOT try to push a page until the sender exists.
