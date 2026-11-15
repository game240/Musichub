# AGENTS.md

## ZEUS mandatory rules

This project is managed by ZEUS (the zeus pi package).

- Do not push to the remote without being asked
- Do not make a release — no version bump, tag, or merge into `main` — unless explicitly asked
- Verify before claiming completion: run the relevant commands and check the actual output
- Do not use Chinese or Japanese unless the user explicitly requests
- Frontend visual design: use StyleSeed (the styleseed pi package, ss-* skills) — ss-build to build, ss-review / ss-score / ss-verify to check before showing the result

## Frontend component structure

The `client/src/components/` tree is two trees in one directory:

- Shared UI vocabulary: `atoms/`, `molecules/`, `organisms/`, `templates/` — domain-agnostic, cross-domain by rule; never import domain code or domain vocabulary (props in, events out)
- Screen tree: `pages/<domain>/` — domain-specific components live inside their domain, never lifted into the atomic layers just because they are "components"
- One screen = one folder: when a screen gains private sub-components, give it `pages/<domain>/<screen>/` holding the page entry and its private files (e.g. `pages/record/archive/`); single-file screens stay flat (`pages/record/RecordAgreePage.tsx`)
- Promote a component to the shared layers only when a second domain actually needs it, not pre-emptively
- Dependency direction is one-way: `pages/<domain>/*` -> `organisms` -> `molecules` -> `atoms`; shared layers must never import `pages/<domain>/*`
- Small single-use helpers stay colocated (inline in the file that uses them); a non-component utility shared within a screen folder goes in a plain module (e.g. `archive/dash.ts`), not mixed with component exports in the same file (`react-refresh/only-export-components`)

## Git workflow

- `main` - default branch; only verified releasable commits
- `dev` - primary development branch
- `feat/*` - feature branches cut from `dev`, merged back with `--no-ff`
- `release/*` - cut from `dev` to prepare a release; lands in `main` as a squash merge
- Commit messages: `type: subject` format (e.g. `docs: update guide`) — short imperative subject, no scope parentheses ([FE], [BE] can be used if necessary), no emoji, no non-ASCII characters

## Docs

- Design docs: `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`
- Implementation plans: `docs/superpowers/plans/YYYY-MM-DD-<topic>.md`
- Design approved before implementation; plan written before touching code
- Product docs (`docs/*.md`, excluding `docs/superpowers/`): English-only, with a translation hint table at the top of the document
- Translation hint table: for ambiguous or important words, ask the user for the Korean term (user-prompted glossary); the pre-defined glossary is empty in this version and will be updated gradually.
