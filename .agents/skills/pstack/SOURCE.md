# pstack vendor source

Vendored from https://github.com/cursor/plugins/tree/main/pstack
(mirrored in this repo as the `vendors/plugins` submodule of the parent
VizMaster checkout; upstream pstack lives at `pstack/` in that repo).

- Plugin version: 0.15.48
- Upstream commit: b1fbf4b6 (vendors/plugins HEAD at vendoring time)
- License: MIT (see LICENSE)

Adaptation, same as the 0.14.4 vendoring: upstream `pstack/skills/<name>/`
is flattened to `pstack/<name>/` so Cloud Agents can load the skill folders
at project level. Plugin-level `agents/`, `automations/`, `docs/`, `assets/`
and `.cursor-plugin` are not vendored. `plugin.json` is kept verbatim from
upstream for version traceability. Desktop Cursor can still install the
marketplace plugin with `/add-plugin pstack`; that install takes precedence
over a same-named local copy.

To update: sync `vendors/plugins/pstack/skills/` over this directory
(excluding plugin.json/LICENSE/SOURCE.md), refresh those three files, and
bump this note.
