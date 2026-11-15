# PROMPT — VClaw LLM provider: wire the desktop app to `llm.vclawhub.com`
> ⛔ DATED 2026-11-15 (operator ruling): vpay, TigerBeetle, and all finance-related features are SUSPENDED on this estate — agents' wallet/payment integrates to vpay.tikoly.com. Canon: docs/lanes/LLM_VPAY_SUSPENSION_PLAN_2026-11-08.md (S0.5–S8). The `llm.vclawhub.com` provider this prompt wires is dead (DNS dark). **The shipped desktop's `provider-setup.ts` defaults still point at the dead URL; its degraded behavior — the wallet read answering `unavailable`, or `DOOR_PROBLEM_UNREACHABLE` on a catch — is EXPECTED under the suspension** (plan S1's pre-stop consumer enumeration), not a bug to fix in the desktop lane. `provider-setup.ts` itself is code and belongs to a code lane.

> **You are the dev agent for `vclaw-desktop/`.** Your job on this task: make **VClaw** — this
> estate's own hosted LLM service at **`https://llm.vclawhub.com`** — a first-class provider in
> the app's provider system, with correct defaults, correct credential handling, and honest
> billing/usage surfacing. Work on the `vizmaster` branch (it already carries the marketplace
> defaults). Everything below is measured or cited — follow the ground rules, and when the
> service's staged reality conflicts with this prompt, **stop and report instead of inventing
> a workaround**.

---

## 1 · What the "VClaw LLM provider" IS

**VClaw is the estate's own LLM door** — kevproxy opened to customers, metered and billed in
the estate's unit **tiko**, settled through **vpay**. Design of record:
`docs/lanes/LLM_VCLAWHUB_ROUTER_BILLING_2026-10-25.md` (parent repo). The facts that shape
your task:

- **OpenAI-compatible**: `POST https://llm.vclawhub.com/v1/chat/completions`, **SSE streaming**,
  model list via `/v1/models`. The door is kevproxy's fourth instance (`kevproxy-vclawhub`,
  `:4003` on kuai), deployed and hardened (K-1 decision-cache poisoning, K-2 pin eviction,
  K-3 8 MiB server-side body bound → 413, G11 glm empty-completion floor).
- **Admission is a spending credential, not just a key**: `sk-…` bearer tokens issued per
  customer/agent, each resolving to a **wallet with its own cap and balance**. The token RIDES
  the attribution: the door's config maps `token → label`, and the ledger's client field is
  **bearer-derived** (`bearer > originator > header` — do not try to spoof identity headers).
- **Metering is automatic; billing settles through vpay** — usage `{input, output, cacheRead,
  cacheWrite}` is captured at the meter sink, priced from a versioned catalog in **integer
  micro-tiko** (`amountMt`, scale 6, BigInt-exact — never a float), settled per request
  (reserve → capture, with a bounded final-frame holdback; mid-stream disconnect captures the
  metered prefix).
- **Money reads do NOT go to the LLM host.** `llm.vclawhub.com` serves model traffic only;
  wallet/balance/receipt reads belong to `https://api.vclawhub.com/v1/vpay` (recorded as
  finding B3). Keep the two hosts strictly separated in code.
- **Staged reality (measured 2026-11-05):** the name resolves to an nginx **401** gate today;
  the documented Cloudflare→tunnel→`192.0.2.20:4003` path and the vpay hookup are **pending
  (M2/M6 of the build plan)**. Build to the CONTRACT below; do not code against the current
  401, and do not "fix" the endpoint from the client.

## 2 · What the app already has (use it — do not build a second provider stack)

The provider layer is **prime-agent's ModelRegistry over `~/.prime/agent/models.json`**:

- `electron/main/providers.ts` wraps it: `catalog()`, `saveApiKey()`, `logout()`,
  `setEnabled()`, OAuth flows, per-harness catalogs. Credentials live in prime-agent's
  `auth.json` (`authStorage.set(providerId, { type: 'api_key', key })`), exposed to the
  renderer via `window.prime.providers.*` (`src/types/api.ts:865-871`).
- **Custom providers are a documented first-class feature**: `~/.prime/agent/models.json`
  (`node_modules/prime-agent/docs/models.md`, `custom-provider.md`). A provider entry is
  `{ baseUrl, api, apiKey, models[], compat }` — `api: "openai-completions"` is the right
  flavour for the VClaw door. `apiKey` may be an **env var name** or a literal.
- The renderer surfaces this as `PrimeModelCatalog` → Settings → Providers
  (`src/pages/settings/ProviderSettings.tsx`), with per-provider `authMethod`
  (`'oauth' | 'api_key' | 'external'`), configured/available state, and per-model
  enable/disable (`withModelVisibility`).

## 3 · What to build

1. **Ship the VClaw provider definition** so the catalog carries it. Preferred: a
   `models.json` provider entry (id **`vclaw`**) with `baseUrl:
   "https://llm.vclawhub.com/v1"`, `api: "openai-completions"`, and models from §4. The
   delivery mechanism is your call between (a) writing the entry into the user's
   `models.json` via the existing settings flow (merge, never clobber other providers) and
   (b) a small bootstrap that merges it on first run — state which you chose and why.
2. **Provider settings surface**: VClaw appears in Settings → Providers with
   `authMethod: 'api_key'`, a key field labelled **"VClaw API key (sk-…)"**, and a status
   line. The key is stored through the existing `saveApiKey` path — **never** in
   `models.json` in plaintext and never in a new store.
3. **Default model config**: mark the VClaw default model as the app's default for new
   sessions on this branch (see §4), while keeping every other provider working unchanged.
4. **Usage/billing surface**: a compact "VClaw usage" row in Provider settings (or the
   Inspector Summary) that reads **wallet balance / cap / recent usage from
   `https://api.vclawhub.com/v1/vpay`** — never from the LLM host. If the vpay read cannot
   be authenticated yet, render "usage unavailable" honestly rather than a zero.
5. **Error mapping** in the provider layer, reusing the estate's failure vocabulary: 401 →
   "VClaw key invalid or missing"; 402/quota → "wallet cap or balance exhausted" (link to
   the vpay surface); 413 → "prompt too large (8 MiB door limit)"; 5xx/timeout → retry with
   backoff. Never a generic "failed".

## 4 · The default LLM config (concrete values)

```jsonc
// ~/.prime/agent/models.json — the "vclaw" provider entry (shape per prime-agent docs)
{
  "providers": {
    "vclaw": {
      "name": "VClaw",
      "baseUrl": "https://llm.vclawhub.com/v1",
      "api": "openai-completions",
      // key is stored in prime-agent auth.json via Settings → Providers; do NOT put the
      // real key here. This placeholder exists because the registry requires the field.
      "apiKey": "VCLAW_API_KEY",
      "models": [
        {
          "id": "<the door's default model id — read it from GET /v1/models once the gate
                 is open; until then take the id list from the kevproxy catalog config, do
                 not invent one>",
          "name": "VClaw",
          "reasoning": false,          // until the catalog says otherwise
          "input": ["text"],
          "contextWindow": 128000,     // verify against the catalog config
          "maxTokens": 4096
        }
      ]
    }
  }
}
```

Default model for new sessions: the VClaw entry, unless the session's project pins another
provider. Do not change any other provider's default.

## 5 · Ground rules (each is a measured estate rule — violating one is a review failure)

1. **The LLM host carries model traffic and nothing else.** No vpay reads, no credential
   reads, no admin calls to `llm.vclawhub.com`. Money surfaces live at
   `api.vclawhub.com/v1/vpay` (finding B3).
2. **No second secret path.** The `sk-` key is stored via prime-agent `authStorage` only.
   `~/.config/vclaw/credentials.json` (the nkey seed) must remain **unread by the desktop**
   — that boundary is recorded in the durable-inbox design and is grep-tested there; keep it
   true here too.
3. **The stream is the product.** SSE streaming must survive your integration; if you buffer,
   you have broken the door's core property (the estate measured the buffering gate defect).
4. **Attribution rides the credential.** Do not add client-editable identity headers.
5. **Delegation ACL (R-C) gates real spend.** The provider is visible when the user has a
   VClaw key; actual spend is capped server-side. Do not build a client-side cap.
6. **Nothing here ships a `--legacy-peer-deps` fix or a dependency that requires one.**

## 6 · Acceptance

- `npm run typecheck` (all five tsconfigs) green; `biome lint` clean on touched files.
- The catalog shows **VClaw** with the model list from §4; Settings → Providers accepts and
  stores an `sk-` key through `saveApiKey`; the model picker can select the VClaw model and
  complete a streaming round-trip **against a local stub server** that serves the
  OpenAI-compatible shape (the public gate is still staged — the stub is the acceptance
  harness, and its response must be byte-shaped like real SSE).
- New-session default model = the VClaw entry; switching harnesses still shows each
  harness's own catalog.
- A test asserts the desktop never reads `~/.config/vclaw/credentials.json` (grep-level,
  like the durable-inbox design's §5.3).
- The usage row renders "usage unavailable" (not zero) while the vpay read is unauthenticated.

## 7 · Open questions — flag them in your report, do not assume

- **Model ids/prices**: the door's catalog is configured server-side; until `/v1/models` is
  reachable, take ids from `kevproxy/config/kevproxy-vclawhub.example.yaml` + the kevproxy
  catalog, and mark them provisional.
- **x402 vs bearer (D-9)**: the recorded recommendation is (b) — `/v1/chat/completions` is
  bearer-authenticated and settles through vpay holds/capture; x402 governs other payment
  surfaces. Build to (b). If the operator amends it, the change is confined to the
  provider's auth header shape.
- **Where the key is minted** (signup flow vs manual paste) is not yet built server-side —
  paste-first is correct today; leave the mint flow to the IDP lane.
