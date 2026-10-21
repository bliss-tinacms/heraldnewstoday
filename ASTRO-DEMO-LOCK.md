# ASTRO-DEMO-LOCK

This is the repository-level, fail-closed implementation contract for exact Astro + Tina demo migrations. `TINA-MIGRATION-GOLD.md` is the parent migration and release policy. GOLD must be updated and validated first; this lock receives every mechanically applicable design, browser, data-shape and release control afterward.

A build, SHA, `RELEASE_COMMIT`, HTTP `200`, screenshot taken at the wrong viewport, or verbal review cannot pass this lock. A required check that cannot run is `BLOCKED`, never silently skipped.

## Mandatory controls

1. **NO-PREMATURE-COMPLETION** — Local build, local capture, upload, extraction, restart, marker and route smoke are intermediate checkpoints. Completion requires the immutable live SHA, identical production lock, admin/island proof, cleanup and post-cleanup health.
2. **AUTHORITY-FIRST** — Name and hash one supplied authority before implementation. Reject unrelated themes, inherited designs, destination-derived expectations and approximations.
3. **GATE-SELF-TEST** — Keep a controlled negative mutation for every template family and shared structural area. Each must fail for its intended invariant.
4. **PRODUCTION-DATA-SHAPE** — Preserve wrappers across rich-text objects, strings, absent blocks and fallbacks; test with destination Tina production-shaped data.
5. **DESTINATION-ENV-ONLY** — Start build, preview and validation from a clean child environment containing only the approved destination Tina identity and origin.
6. **FRESH-PROCESS-AND-SHUTDOWN** — Prove PID, cwd and release-specific output; never validate a process that survived a rebuild; close browser work before orderly termination.
7. **SERIAL-BROWSER-GATES** — Run positive, controlled-negative and authenticated browser suites serially and retain each parsed exit result.
8. **RESOURCE-PREFLIGHT** — Measure `/`, `/tmp`, `/dev/shm`, memory and stale browser processes before browser-heavy work; resource exhaustion is a harness failure.
9. **DETERMINISTIC-TOOLCHAIN** — Use explicit verified Node/package-manager paths and record versions; shell-path failures block the build.
10. **PUBLISHER-BEFORE-FINAL-SHA** — Finish reversible Publisher save → backend → unique public reflection → exact restoration before final immutable packaging; post-cutover checks are read-only.
11. **TRUE-ORIGIN-AND-LIVE-PROOF** — Prove authoritative origin/vhost separately from CDN delivery, authenticate through canonical `/admin/`, and require a real authenticated island POST with non-empty query, variables, data and form metadata.
12. **SELF-CONTAINED-RUNTIME-AND-CLEANUP** — Own or explicitly map runtime dependencies; retain required dependency releases; remove stale archives, extraction directories, locks, diagnostics, obsolete links and owned cron jobs.
13. **STRUCTURED-EVIDENCE** — Emit sanitized machine-readable target, timestamp, source hash, final commit, route, viewport, browser dimensions, assertions, screenshot metric, interactions and exit status.
14. **CHECKPOINT-NOT-COMPLETION** — Enforce authority/hash → implementation → Publisher transaction → final branch tip → clean build/secret scan → fresh local positive → local negative → immutable deploy → live fingerprint → live positive → live negative → read-only admin/island → SHA parity → cleanup → post-cleanup health.
15. **MINIMAL-RETRY-DIAGNOSTICS** — Repair malformed methods, URLs, auth flows, shell paths, resource state, server identity and harness configuration before changing product code or weakening assertions.
16. **LITERAL-VISUAL-NON-APPROXIMATION** — Preserve authoritative DOM/classes, declarations, font binaries/axes, colours, dimensions, spacing, imagery, states, breakpoints and interactions exactly. Tina values may differ only inside locked wrappers.
17. **SHA-HTTP-NOT-VISUAL-PROOF** — Build success, process health, matching SHA and HTTP `200` prove identity/availability only; they cannot replace DOM, computed-style, geometry, screenshot, responsive and interaction evidence.
18. **CLOUD-SOURCE-PRECEDENCE** — Run against destination Tina Cloud records and assert field-by-field precedence. Cloud-only editorial body, wrapper or hierarchy drift is a hard failure.
19. **REAL-WHEEL-STICKY-PROOF** — Require computed sticky state plus settled real-wheel geometry over multiple steps and containing-boundary release when practical; in-motion smooth scrolling is invalid evidence.
20. **RESPONSIVE-RAIL-TOC-CONTRACT** — Test both sides of the source breakpoint: desktop preserves the full sticky rail/card/TOC contract; compact/mobile hides it and exposes the intended static in-article TOC.
21. **COMPLETE-TEMPLATE-FAMILY-MATRIX** — Map and test home sections, archives, article, generic/editorial page, contact, sitemap, catch-all/404, CTA, global chrome and every supplied specialty family at all source breakpoints.
22. **FIXTURE-INTEGRITY-FIRST** — Keep authority fixtures outside implementation output with a checked SHA-256 manifest; reject missing, changed, extra or destination-generated authority before opening a browser.
23. **DUAL-ARTIFACT-SECRET-SCAN** — After the final Tina command and sanitization, scan both completed `dist/` and the exact release archive for protected values, generated credentials, machine paths and `.env` inclusion.
24. **EXACT-SHA-PACKAGE-POINTER-PARITY** — Package from exact full `HEAD`, embed it in `RELEASE_COMMIT`, reopen the archive, and require equality across local HEAD, remote tip, archive marker, physical release and active pointer.
25. **FINAL-POST-CLEANUP-ACCEPTANCE** — After cleanup, rerun route/asset health, pointer/rollback/runtime dependency proof, canonical admin shell and required read-only live lock checks. Final reporting must use this state.
26. **EXECUTABLE-LOCK-READINESS** — Policy markers alone cannot pass this lock. Require validator-enforced executable preflight and controlled-negative preflight, all lock controls, a complete no-extra-file SHA-256 authority manifest, a real positive browser validator, a controlled-negative browser suite and real positive/negative lock commands. Missing authority or browser gates is machine-readable `BLOCKED` with exit `2`; never derive authority from the destination or point the positive lock command only at preflight.

## Transport gates inherited from GOLD

`AUTHENTICATED-GIT-PREFLIGHT`, `PROJECT-SECRET-MAP`, `CPANEL-ENDPOINT-NORMALIZATION` and `CPANEL-RESPONSE-NORMALIZATION` remain transport controls in `TINA-MIGRATION-GOLD.md`. If any prevents live proof, this lock is `BLOCKED`.

## Executable acceptance

Documentation presence is insufficient. The project must implement applicable checks in its source validator, demo-lock, controlled-negative suite, Tina/admin fullcheck, immutable packager/deployer and cleanup verification. The repository validator must reject a missing `ASTRO-DEMO-LOCK.md` or any missing mandatory control above.
