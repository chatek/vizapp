FULL FAILING BLOCKS (run 3347, same pair as 3345; /tmp/423.log on ct16):

--- 1 ---
FAIL tests/release-scripts.test.ts > release preflight > package.mjs --dry-run says nothing executed instead of claiming success
AssertionError: profile vizmaster but product/payload/dist does not exist; the v2 integrator must copy the member payload into product/payload (the legacy vendor/<member> layout is not supported)
: expected 2 to be +0 // Object.is equality
  - 0
  + 2
❯ tests/release-scripts.test.ts:228:68
(227| mkdirSync(dirname(artifactPath)... 228| writeFileSync(artifactPath, contents) ...)

--- 2 ---
FAIL tests/release-scripts.test.ts > release preflight > package.mjs --member refuses an un-integrated payload before electron-builder
AssertionError:
Packaging failed: vizshare surface check failed: missing electron/main/vizshare/agent-assertion-store.ts; missing electron/main/vizshare/agent-token-source.ts; missing electron/main/vizshare/broker.ts (the agent-assertion push route); missing electron/main/vizshare/agent-token-source.ts (the dual-mode rollback switch)
: expected 1 to be 2 // Object.is equality
  - 2
  + 1
❯ tests/release-scripts.test.ts:247:70

MECHANISM FOR #2 (proven by reading, not guessing): the test at :323-350 spawns package.mjs with an ISOLATED cwd (a temp dir that deliberately contains only `electron/main/product-profile.ts`). package.mjs:79 runs `verifyVizshareSurface(process.cwd())` and throws at :82 when the surface files are absent. That throw is caught by the `Packaging failed:` catch-all → exit 1, before the member payload preflight at :144 can `process.exit(2)`. So the surface check (added with the vizshare/agent-assertion work) now runs BEFORE the payload check, and the fixture predates it. Locally it never executes because `toolchainTest` skips on the unpinned toolchain — hence unreproducible here, exactly as you said.

TWO HONEST FIXES for the release lane (both in-scope for that lane, not yours):
a) Fixture: seed `electron/main/vizshare/{agent-assertion-store,agent-token-source,broker}.ts` (minimal exports) into the temp cwd at :342, alongside the existing product-profile re-export. Then the surface passes and the payload preflight reaches exit 2 as asserted.
b) Ordering/semantics: run the member payload preflight BEFORE verifyVizshareSurface (or skip the surface check for `--dry-run` without a payload), so the first refusal is the one the scenario is about. (b) is arguably the better product behavior: a missing payload should not be reported as a packaging-surface failure.

#1 remains as you analyzed: the dry-run test asserts exit 0 while the checkout's default profile is a member; fix = isolated non-member cwd like the sibling at :323.

Nothing else from this lane; consider the release-script pair fully diagnosed.
