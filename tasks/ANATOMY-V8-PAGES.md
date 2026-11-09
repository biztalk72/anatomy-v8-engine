# ANATOMY-V8-PAGES

## Goal
Publish the user's existing Anatomy V8 animation in a new public GitHub
repository and make it usable at the repository's github.io Pages URL.

## Authorization
The user's 2026-11-09 request explicitly authorizes repository creation, local
commit, push and GitHub Pages publication. This supersedes the original
ANATOMY-V8 task's local-only scope for this publication task. Existing account
authentication may be used; do not change authentication or install dependencies.

## Acceptance criteria
- Create a separate repository with a fresh Git history containing only this
  animation's allowlisted source, generated pages, vendor license and preview.
- Do not copy parent Git history, local review packets, private workspace paths,
  secrets, unrelated applications or local environment/configuration files.
- `index.html` must serve the dark-theme animation at the Pages root;
  `light.html` must serve the light-theme variant. Existing controls and mechanics
  must remain unchanged. Both are self-contained and work offline.
- Include build/model/browser-check sources and concise public README instructions.
- Check model invariants, both embedded scripts and deterministic builds; verify
  the root entry point in local Chrome before a local commit.
- Obtain independent Claude source review of the exact public commit before push.
  Maximum two repair cycles. Any source fix requires checks, commit and re-review.
- Create `biztalk72/anatomy-v8-engine` if available; otherwise select a clear new
  name, without overwriting any existing repository.
- Use GitHub Pages branch publication from `main` at `/`, with `.nojekyll` and
  no custom CI workflow. User explicitly requested this hosting configuration.
- Verify the remote head equals the reviewed local SHA, Pages deployment succeeds,
  and both live HTML responses match the committed bytes. Exercise the deployed
  animation in Chrome. Return the working Pages URL and repository URL.

## Limitations retained from original
Educational idealized valve timing and symbolic charge colors; full CAD solid
clearance certification is not claimed. The deployment adds no backend, account
sign-in, database, analytics or external scripts.
