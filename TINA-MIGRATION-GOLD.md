# TINA-MIGRATION-GOLD

This is the mandatory release process for turning this repository into a stable, migration-ready Astro + TinaCMS publisher site.

The protected rollback baseline remains tag `tina-migration-gold-2026-10-17`. Do not move or rewrite that tag. Improvements are committed above it and must pass every applicable gate below before a newer release is described as migration-ready.

## Acceptance states

Never collapse these into one “done” claim:

1. **Source-release ready** — identity-neutral tracked tree, deterministic provisioning, frozen install, local Tina/Astro validation, schema/lock consistency, secret-safe diff, exact-demo containment where applicable, and a committed release candidate.
2. **Cloud/live accepted** — candidate pushed to the connected branch, Tina Cloud indexed, normal cloud-checked build passed, synchronized artifact set deployed, authenticated Publisher save/public/restore transactions passed, integrations verified, and desktop/mobile live checks passed.

A local build or `--skip-cloud-checks` build proves only local source integrity. It never proves Tina Cloud or production acceptance.

## Non-negotiable process

### 1. Preserve exact demo design

When a demo/source is supplied:

- Copy its DOM structure, classes, declarations, fonts, colors, sizes, weights, spacing, section order, assets, and responsive rules exactly.
- Do not redesign, simplify, omit, approximate, or add original styling.
- Keep the approved global header/footer outside the isolated body host unless replacement is explicitly requested.
- Put the copied page body under a dedicated host and scoped reset so legacy site CSS cannot contribute undeclared typography, color, decoration, spacing, borders, dimensions, or responsive behavior.
- Replay the demo’s universal baseline under the same scope after any `all: revert` reset.
- Preserve Tina fields and `data-tina-field`; replace only visible demo values with dynamic bindings.
- Compare source and implementation at desktop, tablet/source breakpoints, and phone widths using screenshots plus computed-style/geometry checks.

### 2. Keep visible output Tina-driven

- No hardcoded titles, descriptions, people, bylines, biographies, categories, menus, logos, contact details, SEO values, article cards, archive lists, or sitemap entries.
- Tina Cloud/backend values drive public output. Repository content is fallback only and must never silently override a saved Cloud value.
- Public and editable loaders are separate contracts: editable loaders must return the real query, variables, authoritative data, `data-tina-form`, and exactly one intended `data-tina-primary` form.
- Dynamic archives, users, categories, sitemap, navigation, global chrome, and 404 helpers must derive from collections rather than duplicated code arrays.

### 3. Enforce destination identity neutrality

The reusable source and each independent clone must not inherit the source publication’s:

- Tina client/project ID, content endpoint, repository, or branch;
- domain, canonical URL, or analytics identity;
- Cloudinary folder or API key/secret pair;
- Formspree endpoint;
- logo, favicon, authors, navigation filenames, brand copy, screenshots, or customer assets;
- generated admin identity, workstation paths, tokens, backup files, or deployment archives.

Missing destination identity must fail validation. It must never fall back to the boilerplate project. Audit the entire tracked tree, not only new diff lines. A blank logo must render a neutral configured wordmark, not a legacy image fallback.

### 4. Make runtime environment authoritative

- Resolve `.env` relative to the startup module/application root, never the process working directory.
- Prefer the first explicit environment file in this order: `SITE_ENV_FILE`, application-root `.env`, then current-directory `.env` only when intentionally supported.
- Explicit destination values must override stale Passenger-inherited values.
- Validate runtime site URL, Tina client ID, branch, repository, content endpoint, Cloudinary folder, and Formspree configuration as one destination identity contract.
- Treat the exact deployed application-root environment as a release artifact. Before every restart/cutover, run `SITE_ENV_FILE=/absolute/path/to/live/.env pnpm validate:site` against that file; repeat for every retained rollback runtime that may be activated. A local source `.env`, a build-time environment, or a previous release check cannot certify the live Passenger environment.
- Require all four non-empty Cloudinary runtime variables together: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and the site-unique `CLOUDINARY_ROOT_FOLDER`. Missing the root folder is a hard deployment failure even when a direct signed SDK upload/delete succeeds.
- Keep production `.env` outside release archives, ignored by Git, and mode `0600`.

### 5. Query the verified Tina destination first

#### 5.0 Verify every provided destination resource before declaring anything missing

> **NON-NEGOTIABLE PROVIDED-RESOURCE RULE:** The user-provided account, organization, repository, branch, API keys, tokens, client ID, credentials, and deployment details are authoritative inputs. Check and use those exact supplied resources. Never assume, infer, substitute, create, rotate, or borrow a value from another account or project. For `heraldnewstoday`, check **`bliss-tinacms’s Organization`**, where the project lives—**not `Bliss Drive’s Organization`**. Verify every value independently and stop on any mismatch instead of guessing.

- **Do not assume from the default account, organization, repository, key, or token shown after login.** Enumerate the organizations available to the supplied Tina account and deliberately select the organization that owns the destination project.
- For Bliss Drive publisher migrations, check **`bliss-tinacms’s Organization` instead of `Bliss Drive’s Organization`**. The `Bliss Drive` login may be an Admin collaborator while the project is owned by the `bliss-tinacms` organization. An empty project list in `Bliss Drive’s Organization` does **not** prove that the supplied account has no projects.
- For `heraldnewstoday`, explicitly select **`bliss-tinacms’s Organization`**, where the project lives, and verify the existing **`heraldnewstoday`** project before making any project-access conclusion.
- Double-check the supplied Tina login, selected organization, project name/client ID, connected GitHub account and repository, branch, API keys, content token, Cloudinary credentials/folder, Formspree endpoint, cPanel account/domain, and deployment paths against the provided tracker, secret store, repository environment, and live service UI. Compare secret values with masked fingerprints or equality checks; never print them.
- A login landing in the wrong organization, one failed request, an empty default view, or a missing local credential helper is not evidence that the resource was not provided. Search all approved provided sources and switch to the verified owner organization before reporting `BLOCKED`.
- Never create a replacement account, project, repository, API key, token, form, media folder, or deployment target merely because the first/default selection is empty. Use the provided resources and verify their identity and permissions first.
- Record positive evidence for each identity contract: exact organization, project/client ID, connected repository, branch, and successful authorized query. If evidence conflicts, stop and reconcile it instead of guessing.

- Construct the direct Tina content endpoint from the verified destination client ID and branch.
- For server-side/public reads, prioritize that verified endpoint ahead of inherited `TINA_UPSTREAM_CONTENT_API_URL` or `TINA_DIRECT_CONTENT_API_URL` values.
- Require returned Global Config/site identity to match the destination before Cloud data can override repository fallback.
- Treat authentication and project authorization as separate checks: successful login does not prove project/branch access.
- A same-origin content proxy is transport only. It may forward requests and auth headers but must not inject the server token for anonymous requests, strip fields, rewrite mutations, coerce rich text/references, merge local frontmatter, persist overrides, or synthesize success.

### 6. Treat schema changes as migrations

Every schema/model change requires one synchronized change set:

- collection definitions;
- handwritten queries/loaders;
- content documents;
- `tina/tina-lock.json`;
- required generated types/schema artifacts;
- tests and fullcheck fixtures.

Then run generation, sanitize generated clients, commit/push, wait for Tina Cloud indexing, inspect direct GraphQL field/cardinality parity, and run the normal cloud-checked build. Field renames should be additive first; remove legacy fields only in a separately verified migration.

### 7. Preserve collection-driven relationships and MULTICAT-LOCK

- Blog authors reference User records; name, avatar, biography, URL, byline, and author box resolve from the same selected record.
- Header/footer roles reference Navigation documents through Global Config; runtime code must not depend on fixed filenames.
- Category choices come from the authenticated paginated Category collection, never a source-code list.
- If native multi-reference lists fail the active Tina version, store a string list and use a tested custom field that saves canonical `_sys.path`, preserves unavailable selections, supports refresh, and calls `input.onChange`.
- Open a post with at least two categories, prove both remain selected, save a temporary category assignment, verify public reflection, then restore exactly. Never reduce an existing array to one category.

### 8. Preserve rich-text fidelity

The renderer and migration adapter must support and test paragraphs, headings, bold/italic text, links, escaped characters, ordered/unordered lists, embeds, and inline Cloudinary images. Verify one real article through authenticated edit, public rendering at the exact media URL, exact document restoration, and media cleanup.

### 9. Isolate external services per site

Each independent publication requires its own repository, Tina project/branch, canonical origin, Cloudinary root folder, and Formspree form. Prefer a named per-site Cloudinary key even when the account is shared.

- Cloudinary preflight: validate the exact active and retained-rollback application-root environments and require the four-variable set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, and `CLOUDINARY_ROOT_FOLDER`; the root folder must be unique to the site.
- Cloudinary live proof: open a real image field in the authenticated Tina admin, open its Media Manager, require the browser's authenticated `GET /api/cloudinary/media` to return `200`, require no Cloudinary error state, and visibly confirm `Upload`/`New Folder` controls or assets. Then perform a reversible authenticated UI upload, route deletion, and independent post-delete absence check.
- A direct Cloudinary SDK upload/delete, an unauthenticated expected `401`, or non-empty credentials alone does **not** certify Tina Media Manager. The list route can still fail with `500` when `CLOUDINARY_ROOT_FOLDER` is absent.
- Formspree proof: read the live DOM action and POST to that exact endpoint only when authorized; require `200 {"ok":true}`.
- A login page, console access, unauthenticated `401`, or configured string alone is not integration proof.

### 10. Keep public email addresses ordinary

Public emails must remain readable text and normal `mailto:` links. Reject `[email protected]`, exact `data-cfemail` attributes, `/cdn-cgi/l/email-protection`, or generated decoder markup. Use response-level `Cache-Control: no-transform` and an email-protection fence when required, then verify cache-busted raw CDN HTML and hydrated DOM on every affected route.

### 11. Build and deploy one immutable release

- Install from the tracked lockfile with a frozen install.
- Run source/runtime validators, local Tina diagnostics, Astro diagnostics, secret/path scans, referenced-asset checks, and `git diff --check`.
- Capture the full release SHA with `git rev-parse HEAD`; never reconstruct it from a short SHA.
- Build a secret-free archive and reopen it before upload.
- Replace the application tree cleanly rather than extracting over the old tree; overlay extraction can retain deleted routes and stale assets.
- Deploy server output, client assets, `public/admin/`, content, startup/package files, and the release marker as one synchronized set. Keep `.env` separate.
- Restart only the target application using a verified Passenger recycle/app-group method. A touched restart marker alone is not proof.
- Require exact equality among local `HEAD`, remote branch, cloud-built candidate, archive marker, and production `RELEASE_COMMIT`.
- Keep and integrity-test a rollback archive before cutover.

### 12. Protect concurrent Tina commits

Immediately before push, fetch the Tina-connected branch, inspect remote-only commits, and rebase the verified candidate above legitimate editor changes. Preserve neutral-safe content and reject source identity leakage. Never force-push over Tina-generated commits. Rerun sanitization, validation, secret scans, and clean-tree checks after rebase.

### 13. Run executable TINA-FULLCHECK and PUBLISHER-ADMIN-GATE

Coverage must be derived from the configured Tina collection set and equal the explicit test map. For every configured collection—normally Blog, Page, Category, User, Navigation, and Global Config—use the real live Publisher admin account and run:

1. open the exact document and wait for its real fields;
2. capture the complete original value/document;
3. make a safe visible marker edit and save through the Tina UI;
4. prove the authenticated Tina backend contains the marker;
5. prove the unique mapped public DOM/meta location reflects it with cache bypass;
6. restore the exact original through the admin;
7. prove authenticated backend restoration;
8. prove cache-busted public restoration and marker absence.

Also test editable SEO title/description/canonical/robots/Open Graph/Twitter/JSON-LD as applicable; one Page and one Blog article; `MULTICAT-LOCK`; author resolution; Navigation; header/footer logos; rich-text image upload; Cloudinary; and Formspree when authorized. Restoration outranks starting another test. Any incomplete login, save, public mapping, cleanup, or restoration is `BLOCKED`, not done.

#### AUTHOR-ISLAND-EDITABILITY-001

Both canonical `/author/<slug>/` and editor-alias `/blog/author/<slug>/` routes must expose the same `/tina-island/author?slug=<slug>` contract. Its preview POST must contain exactly one stable form ID, a substantial generated User query, `variables.relativePath === "<slug>.json"`, an authoritative `user` data object, and exactly one primary form. A rendered author archive or HTTP 200 with `query: ""`, `variables: {}`, or only `_content_source` fails this gate. Publisher/Admin acceptance must edit one visible User field, prove authenticated backend and cache-busted public reflection, restore through the sidebar, and prove exact backend/public restoration and marker absence.

### 14. Verify routes, metadata, assets, and visuals

After deployment verify:

- home, standard pages, blog index, article, category, author, sitemap, RSS, contact, `/admin/`, and an intentional 404;
- every referenced hashed asset returns `200` with the expected content type;
- canonical, Open Graph, Twitter, RSS, and sitemap origins are the public HTTPS origin, never localhost;
- no console errors, failed requests, broken images, horizontal overflow, clipped text, or duplicated global sections;
- exact-demo screenshot and computed-style parity at desktop/mobile and every supplied breakpoint;
- readable public emails with no Cloudflare protection artifacts.

### 15. Keep source-ready and live-ready reporting separate

Report every gate as `PASS`, `FAIL`, or `BLOCKED`, with evidence. Do not call the source or migration stable while a required gate is blocked. A source-ready commit can be reported while push, Cloud indexing, deployment, or live admin verification remain pending, but it must not be described as cloud/live accepted.

### 16. FAILURE-DERIVED EXECUTION GATES — prevention must be executable

These gates permanently encode failures discovered during real migrations. They are mandatory on every migration. A verbal promise, retrospective, local-only result, generic HTTP sweep, or unchecked box cannot satisfy them.

1. **NO-PREMATURE-COMPLETION.** Never present a local build, local screenshot, archive, upload, extraction, restart request, release marker, or generic HTTP `200` as the deliverable. Completion requires the final immutable production SHA, live route/asset checks, exact demo gate where applicable, authenticated admin evidence, real island traffic, rollback proof, SHA parity, and cleanup. Progress reports must say `INTERMEDIATE`, not imply completion.
2. **AUTHORITY-FIRST.** Before implementation, name and hash the one authoritative source set. Reject unrelated designs and inherited themes. If source is missing or contradictory, stop `BLOCKED`; never approximate, redesign, normalize, or encode the current destination as the expected result.
3. **GATE-SELF-TEST.** A validator is not trusted until controlled negative tests prove it rejects one expected violation per template family and shared structural area. Each mutation must fail for its intended invariant, not an unrelated browser, route, or resource error. A release accepted by an older weak gate must be treated as unverified until rerun through the hardened gate.
4. **PRODUCTION-DATA-SHAPE.** Required DOM wrappers and visual structure must sit outside representation-specific branches. Test rich-text objects, strings, absent optional blocks, and fallbacks with destination Tina Cloud data. Local fixtures/local mode alone cannot certify production structure.
5. **DESTINATION-ENV-ONLY.** Start build, preview, SSR, admin, and validation from a clean child environment; explicitly load the approved destination env; verify client ID/branch/origin before launch; and fail if required values are absent. Inherited Tina endpoints/tokens and unrelated project values must never win. Do not start a validation server without this preflight.
6. **FRESH-PROCESS-AND-SHUTDOWN.** Never validate through a process that survived a rebuild. Prove listener PID/cwd and a release-specific selector, close browser contexts and in-flight requests before termination, then stop the workspace-owned server. Label expected `SIGTERM`/shutdown connection errors as local-only and immediately run a live health probe so shutdown noise cannot be mistaken for production failure.
7. **SERIAL-BROWSER-GATES.** Run the full positive visual/DOM/interaction suite, controlled-negative suite, and authenticated admin suite serially. Parallel Chromium trees on constrained hosts are forbidden. Preserve each parsed result and exit code before starting the next suite.
8. **RESOURCE-PREFLIGHT.** Before browser-heavy work, builds, or release packaging, measure `/`, `/tmp`, `/dev/shm`, memory, and stale browser processes. Enforce a project-defined free-space floor; clean only known disposable caches/artifacts; retain required browser binaries; then re-measure. Resource exhaustion is an infrastructure failure, never evidence that the site passed or failed its design gate.
9. **DETERMINISTIC-TOOLCHAIN.** A clean build environment must use explicit verified Node/package-manager paths rather than interactive/login-shell initialization. Record tool versions. `command not found` is a failed preflight and must be corrected before any build claim.
10. **AUTHENTICATED-GIT-PREFLIGHT.** Before the release sequence, verify remote, branch, fetch and push authorization without printing or persisting credentials in the remote URL. Keep push as a standalone operation. A local commit is not remote release evidence.
11. **PUBLISHER-BEFORE-FINAL-SHA.** Run the mutating Publisher save → authenticated backend → unique public reflection → exact restore gate before the final immutable build. Fetch the restoration commits, inspect equality, rebase/fast-forward, rebuild and deploy that exact final tip. After cutover, use read-only admin proof; do not create an infinite mutation/redeploy loop.
12. **PROJECT-SECRET-MAP.** Check the approved project-specific secret/tracker location before searching conversation history or broad databases. Maintain a secret-safe ledger of variable names and protected source paths, never values. Do not ask again for securely available inputs.
13. **CPANEL-ENDPOINT-NORMALIZATION.** Normalize stored cPanel hosts exactly once: detect protocol and existing port before adding `2083`, validate the final URL, and never construct duplicate-port endpoints.
14. **CPANEL-RESPONSE-NORMALIZATION.** Inspect API response types and normalize both arrays and objects keyed by application name before iteration. Never guess the Passenger app root or document root from a similar folder name.
15. **TRUE-ORIGIN-PROOF.** A public DNS address behind Cloudflare is not the origin. Obtain the authoritative origin/vhost mapping from hosting inventory before `--resolve`; separately prove apex and `www` with TLS SNI. CDN checks and private cPanel release markers are complementary, not interchangeable.
16. **AUTHENTICATED-ISLAND-POST.** Tina island acceptance requires real authenticated browser/preview traffic or an equivalent correct `POST`: status `200`, non-empty response, non-empty query, meaningful variables, expected data key, form metadata, and exactly one intended primary form. Anonymous `GET`, expected `405`, shell visibility, or an empty HTTP-200 form is not proof.
17. **CANONICAL-ADMIN-LOGIN.** Authenticate through canonical `/admin/` before adding cache-busting parameters or hash routes. Capture Tina Cloud popups, return to the original context, wait for a concrete collection field, and preserve one browser context through verification. A preview shell or redirect is not an authenticated collection pass.
18. **SELF-CONTAINED-RUNTIME.** Prefer a production-only dependency tree owned by each release or a verified shared runtime. If a new release links `node_modules` from a previous physical release, record that dependency edge, verify the symlink, and forbid cleanup of that release. Never mislabel a runtime dependency as disposable rollback history.
19. **RETENTION-CLEANUP.** Final acceptance must leave one active release, one explicitly approved rollback/runtime dependency, no uploaded archive, no extraction directory, no deploy lock/log marker, no obsolete rollback links, no public ZIP, no temporary diagnostics, and zero owned one-shot cron jobs. Re-run live health after cleanup.
20. **STRUCTURED-EVIDENCE.** Use structured readers/parsers and machine-readable gate output. Do not base acceptance on truncated terminal display, copied line-number output, or unparsed logs. Preserve command exit codes and sanitize evidence before reporting.
21. **EVIDENCE-ARTIFACT.** Every Publisher/admin transaction must write a sanitized result containing target, timestamp, final commit, collection/document, original-value hash, marker observation, authenticated backend reflection, unique public selector/meta reflection, exact restoration hash, marker absence, and unrelated-content drift result. Parse and retain this artifact immediately.
22. **CHECKPOINT-NOT-COMPLETION.** Treat build, upload, extraction, restart, marker, and route-smoke success as checkpoints. The mandatory order is: authority/hash → implementation → Publisher mutation/restore → final branch tip → clean production build/secret scan → fresh local production gate → local negative gate → immutable package/deploy → live fingerprint → full live positive gate → live negative gate → authenticated read-only admin/island proof → exact SHA parity → cleanup → post-cleanup health gate.
23. **MINIMAL-RETRY-DIAGNOSTICS.** When a probe fails because the method, URL shape, shell path, auth transport, resource state, or API response shape was wrong, classify and correct the harness first. Never weaken product assertions, lower visual thresholds, or change site code merely to make a malformed diagnostic pass.
24. **LITERAL-VISUAL-NON-APPROXIMATION.** When a supplied demo is authoritative, preserve its exact DOM/classes, CSS declarations, fonts and font binaries/axes, colours, dimensions, spacing, imagery, states, breakpoints and interactions. “Close enough,” a redesigned equivalent, a cleaned-up hierarchy, a similar inherited component, or subjective visual approval is failure. Tina may change values; it may not change the locked wrappers and presentation around those values.
25. **SHA-HTTP-NOT-VISUAL-PROOF.** Matching local/remote/deployed SHAs, a valid `RELEASE_COMMIT`, HTTP `200`, successful build, or healthy process proves identity/availability only. It never certifies visual, structural, responsive, sticky, admin, or dynamic-data parity. Those require their own DOM, computed-style, geometry, screenshot, interaction, and authenticated data gates.
26. **CLOUD-SOURCE-PRECEDENCE.** Run the exact lock against destination Tina Cloud/production-shaped records, not only local MDX or static fixtures. For every template whose Cloud representation differs, assert which source wins for each field and require the authoritative body/hierarchy to survive rich-text object, string, absent and fallback shapes. An editorial body or wrapper that changes only in Cloud mode is a release blocker.
27. **REAL-WHEEL-STICKY-PROOF.** A computed `position: sticky` declaration and top offset are necessary but insufficient. Use real wheel input, wait until scroll position and element geometry settle, prove the rail pins at the source-derived offset over multiple wheel steps, and prove the correct release behavior at the containing boundary when practical. Smooth `scrollTo` measurements taken in motion do not count.
28. **RESPONSIVE-RAIL-TOC-CONTRACT.** Independently lock desktop and compact article behavior. Desktop must preserve the source rail width, card/TOC hierarchy, sticky offset and visibility; compact/mobile must hide the wide rail and expose the intended in-article TOC as static/non-sticky. Test both sides of the source breakpoint so a desktop fix cannot silently break mobile or vice versa.
29. **COMPLETE-TEMPLATE-FAMILY-MATRIX.** Inventory every authoritative family and shared structural area before implementation: home sections, archives, article, generic/editorial page, contact, sitemap, catch-all/404, CTA, header/footer and any supplied specialty template. Each family needs a route/component mapping, DOM contract, desktop/mobile checks and at least one controlled mutation. Testing only user-highlighted screenshots is incomplete.
30. **FIXTURE-INTEGRITY-FIRST.** Store the authoritative fixture corpus separately from implementation output with a checked SHA-256 manifest that excludes itself. Require unique normalized manifest paths and reject duplicate entries before hashing. Reject symlinked authority roots, manifests, fixture files or directories; require segment-safe lexical containment plus realpath containment inside the authority root. Enumerate the complete fixture tree and reject every unmanifested file. Verify every expected path/hash before starting a browser or deriving assertions. A changed, missing, extra, escaped, symlinked or implementation-generated “authority” fixture fails closed; never silently refresh fixtures from the destination under test.
31. **DUAL-ARTIFACT-SECRET-SCAN.** After the final credentialed Tina command and sanitization, scan both the completed `dist/` tree and the exact final release archive for protected token/password/secret values, generated client credentials, machine paths and accidental `.env` inclusion. A clean source tree or clean `dist/` alone is insufficient. Report key names/counts only, never values.
32. **EXACT-SHA-PACKAGE-POINTER-PARITY.** Build the archive from `git archive <full HEAD>` plus only the verified generated runtime payload, write that exact full SHA to `RELEASE_COMMIT`, reopen and verify the archive before upload, and require equality among local HEAD, remote branch tip, archive marker, physical release marker and active production pointer after cutover. Upload/extraction success or a guessed/expanded short SHA cannot pass.
33. **FINAL-POST-CLEANUP-ACCEPTANCE.** After artifact, stale-release/link and owned-cron cleanup, rerun route/asset health, release-pointer/rollback/runtime-dependency checks, canonical admin shell and the required read-only live lock evidence. Cleanup is part of release acceptance and may not invalidate the active runtime, rollback or evidence. The last report must be based on this post-cleanup state, not a pre-cleanup pass.
34. **EXECUTABLE-LOCK-READINESS.** Policy documents and marker checks cannot pass `ASTRO-DEMO-LOCK` by themselves. Every repository must carry a validator-required executable preflight and controlled-negative preflight. The preflight must verify every lock control, a complete SHA-256 authority manifest with no unmanifested files, a real positive browser validator, a controlled-negative browser suite, and real positive/negative lock commands. Missing source authority or browser gates must emit sanitized machine-readable `BLOCKED` with exit `2`; never generate authority from the destination or point the positive lock command only at policy preflight.

The repository validator must require every named marker above. Applicable rules must also be implemented in the executable build, demo-lock, admin/fullcheck, deploy, and cleanup scripts; documentation presence by itself is not release acceptance.

## Required validator coverage

The repository validator must reject at minimum:

- source brands, domains, people, service IDs, and customer assets in runtime source;
- tracked `.env`, filled manifests, secrets, generated tokens, machine paths, backups, and generated cross-site admin bundles;
- missing package lock or `tina/tina-lock.json`;
- hardcoded category options, users, navigation filenames, and visible fallback content;
- a content proxy that rewrites typed Tina data or elevates anonymous requests;
- malformed/non-origin `SITE_URL` and localhost production metadata;
- non-unique Cloudinary root folders and inherited Formspree endpoints;
- a missing `CLOUDINARY_ROOT_FOLDER` in the exact deployed or retained-rollback runtime, or Cloudinary acceptance that omits the authenticated Media Manager list/UI path;
- missing release/fullcheck commands and this process document.

## Required command sequence

### Neutral source candidate

```sh
pnpm install --frozen-lockfile
pnpm validate:starter
pnpm build:local
pnpm astro check
git diff --check
```

### Provisioned destination candidate

```sh
pnpm site:provision -- --manifest site.manifest.json
pnpm validate:site
pnpm build:local
pnpm astro check
```

Push the destination branch only after the source gates pass. Wait for Tina Cloud indexing, then run:

```sh
pnpm build
pnpm tina:fullcheck
```

`pnpm tina:fullcheck` is not complete until its authenticated live-admin save/public/restore companion gate has passed for every configured collection.

Immediately before restarting or switching the production application, validate the exact protected host environment (and each retained rollback environment) rather than relying on the local build environment:

```sh
SITE_ENV_FILE=/absolute/path/to/application-root/.env pnpm validate:site
```

After restart, reopen a real Tina image field and complete the authenticated Media Manager `GET 200` plus reversible UI upload/delete proof. Do not substitute a direct Cloudinary SDK test.

## Final release record

Record, without exposing secrets:

- protected baseline tag;
- candidate full SHA;
- remote branch SHA;
- deployed `RELEASE_COMMIT`;
- Tina project/repository/branch equality;
- source validation and cloud-build results;
- per-collection Publisher gate results;
- MULTICAT, SEO, rich-text/media, Cloudinary, and Formspree results;
- exact active/rollback host-environment validation and the complete four-variable Cloudinary key-presence result (names/status only, never values);
- authenticated Media Manager list status, visible controls/error absence, reversible UI upload/delete, and post-delete absence;
- route/asset/metadata/browser results;
- rollback archive integrity;
- temporary marker/upload cleanup and exact restoration.
