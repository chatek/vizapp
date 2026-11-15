# VizMaster project payload

This directory is the product payload the desktop app seeds as its ONE project
on first run. The member profile in the VClaw carrier checkout
(`product/vizmaster.json`) points `defaultProject.from` at the packaged
payload, and the carrier's profile-driven seeder (`seedDefaultProject`) copies
it to the machine folder `~/.vizmaster/default` — the app's only project.
`BUILD.json` is stamped next to this content at bundle time; the three
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

The checked-in copy carries this README alone; a member build bundles the
member payload first (`npm run bundle:vcclaw` — `scripts/bundle-vizmaster.mjs`
merges this content into the built app tree), then
`scripts/integrate-vcclaw.mjs` copies the bundle into the VClaw carrier as
`product/payload`. The same script renders the carrier's
`product/profile.active.json` from `product/vizmaster.json`, stamping
`defaultProject.version` from the payload's `BUILD.json` so the packaged
profile names the release actually built — never a hand-typed literal. What
the seeder must not touch (`node_modules/`, `.git/`) is filtered at copy time.
