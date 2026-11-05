# VizMaster project payload

This directory is the product payload the desktop app seeds as its ONE project on
first run. The product profile (`product/vizmaster.json`, mirrored into
`product/profile.json` for development) points `defaultProject.from` here, and the
seeder copies it to the machine folder `~/.vizmaster/default` — the app's only
project. `BUILD.json` is stamped next to this content at seed time; the three
subdirectories below are user-owned once seeded and are never overwritten by an
upgrade.

## Layout

- `templates/` — VizMaster document and render templates. The member's tooling
  treats these as the starting set; anything the user adds or edits here stays
  theirs across app updates.
- `skills/` — agent skills shipped with the product. Like templates, the folder
  belongs to the user after seeding: new skills are kept, and a payload refresh
  never deletes them.
- `code/` — the VizMaster code payload (scripts and support code the app and the
  member's tooling execute against the project). Same user-ownership rule.

## Build-time notes

The checked-in copy carries this README alone; a member build replaces the
directory contents with the member bundle before packaging
(`scripts/release/package.mjs` stages the chosen profile, and
`defaultProject.version` is rendered from the payload's `BUILD.json`). Anything
the seeder must not touch — `node_modules/`, `.git/`, `lessons/` — is filtered at
copy time by `electron/main/default-project.ts`.
