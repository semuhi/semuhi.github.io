# Launch checklist — Constellation swap goes public (Phase 5)

Per GAMEPLAN v3 §7 ("build, links, mobile, no-AI-tells copy pass"). The swap is already
live locally on `main` of the website repo; nothing has been pushed. The first push is
the FIRST real Jekyll/Liquid build of every Constellation include, so treat it as a
deploy, not a routine push.

## 1 · Before the push (data gaps — user input, never invent)
- [x] URLs for publications ids 52–53 — supplied 2026-07-18 (id 53 via archive.org;
      the live TPQ page is gone).
- [x] Highlight URLs — all 9 cards linked (IDOS blog + IDOS YouTube); Jan 2026 entry
      retitled to the actual blog post; 4 new cards added (2x GMF26, Geneva, business
      video).
- [x] First `_data/social.yml` batch — 32 cards (17 LinkedIn + 15 Bluesky), verbatim
      excerpts, rendered as the homepage "Field notes" strip (newest 8).
- [x] PDF CV — user decision 2026-07-18: keep empty for now (structured CV only).
- [ ] USER SIGN-OFF on the full preview before any push (explicit instruction
      2026-07-18: do not push until verified).

## 2 · Pre-push local verification
- [ ] `ruby _design/preview/make_fixture.rb` runs clean; item count matches `_data/`.
- [ ] Fixture pass in the browser: home network (nodes/diamonds/chips), all five
      portfolio pages incl. the four interactive slots, wall filters, teaching, about.
      Zero console errors.
- [ ] `constellation-flat.css` in sync with `_sass/constellation/` (fixture styling
      matches what SCSS will compile to).
- [ ] Copy pass over anything new: no em-dashes, no LLM-tell vocabulary, provenance
      lines present on every interactive that shows numbers.

## 3 · Push and watch CI (the risky step)
- [ ] Push `main`; watch the GitHub Pages build (Actions tab).
- [ ] Likeliest failure points: Liquid filters in `c-about.html` and
      `c-portfolio-page.html`, and the `redirect` layout — check these first if the
      build breaks.
- [ ] If the build fails: fix locally, re-verify via fixtures, push again. Do not
      debug by pushing blind commits.

## 4 · Post-deploy smoke test (on semuhi.github.io)
- [ ] `/` renders the Constellation home; network hero interactive; playable finding
      bars render (finding.js now loads from inside `c-finding.html`).
- [ ] All five `/portfolios/<key>/` pages; interactives on 01 (finding), 02 (conjoint),
      03 (DERTT teaser), 04 (Toolkit architecture) all render and respond.
- [ ] `/work/` wall renders all items and filters combine.
- [ ] `/teaching/` and `/about/` (+ `#cv` anchor) render.
- [ ] Redirects resolve: `/research/` → `/portfolios/`, `/other-pub/` → `/work/`,
      `/resume/` → `/about/#cv`, `/home-preview/` → `/`, `/teaching-preview/` →
      `/teaching/`.
- [ ] 404 page styled; favicon; `<title>`s sensible.
- [ ] External link spot-check: one publication URL per portfolio page + the three
      footer links.
- [ ] Mobile (≤980px, real phone or devtools): hero head goes static, cards collapse,
      wall rows collapse, interactives stack one-column.

## 5 · After launch
- [ ] Run the `site-update` workflow once with a test item end-to-end (classify →
      append → fixture → commit), then revert or keep the item (§7 acceptance).
- [ ] Google Search Console: submit sitemap if not already indexed.
- [ ] Remaining Phase 4+ ideas ship incrementally (deeper DERTT browsing stays out by
      decision of 2026-07-17: teaser only).
