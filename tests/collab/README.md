# Collab E2E harnesses

> **A harness that bypasses the client's code path cannot catch a client defect, and a
> throwaway broker that denies nothing cannot catch a grant defect.**
>
> Two of this sprint's three worst defects were exactly that shape: the shipped desktop
> published drafts to a subject nobody subscribed to (both harnesses called the Micro
> endpoint directly and missed it), and a stale bundle shipped previous code with health
> green (`npm run build` is tsc-only; `--no-build` ships whatever exists). The next person
> will make the same mistake in the other direction — driving the client against a broker
> that would deny nothing in production.

## Files

- `collab-e2e.mjs` — the independent **service-plane** harness (11 legs). Drives the
  REST follow/consent surface and the Micro endpoints directly with minted assertions.
  Does NOT import the desktop's code: it validates the service's contract from outside.
- `desktop-driven-draft.mjs` — the **client-plane** harness (6 legs). Imports the shipped
  `suggestions-service` (TS source via tsx), constructs it the way `index.ts` does, and
  drives the public methods the renderer uses (`openSession` + `setDraft`). The ONLY
  fixture piece is the connector (the throwaway broker has no vgate to mint a user JWT).

## Running

Both need the throwaway stack running: broker on 14299, VIZSHOW_EVENTS stream, the
service at 8089 with `PROMPTS_MICRO=1 VIZMASTER_STORE=nats VIZMASTER_AGENT_AUTH=1
NATS_CREDS=… VIZMASTER_SUBHASH_KEY=<64hex> VIZMASTER_SEGMENT=vcc`, and seeded principals
(bindings + ownership in KV, keyed by NKEY).

```bash
node tests/collab/collab-e2e.mjs          # service-plane, 11 legs
npx tsx tests/collab/desktop-driven-draft.mjs  # client-plane, 6 legs
```

Env for both: `STUDENT_NKEY` `STUDENT_SEED` `TEACHER_NKEY` `TEACHER_SEED`
(+ `STUDENT_SUB_HMAC` for the legacy-subject negative leg).
