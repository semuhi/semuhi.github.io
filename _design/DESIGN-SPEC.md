# semuhi.github.io — design spec v3 (LOCKED)

Locked 2026-07-17 from the picked Phase 1 direction: **A · Constellation**
(`_design/mockups/mockup-A-constellation.html`). Supersedes the 2026-06-26 spec.
Build against this; do not re-open the aesthetic or the v3.2 taxonomy without the user.
Mockups B (Index) and C (Observatory) stay in `_design/mockups/` as reference only.

## Spine
The political economy of authoritarian power: how autocrats hold power with money,
propaganda, and technology, and how democracies and their partners push back.
Business is the connective tissue, carried by portfolio 02 and the gold thread.

## Taxonomy — v3.2 FINAL (three review rounds, 2026-07-17)
Five portfolios: four marquee initiatives plus the trunk. Full mapping and rationale in
`_design/GAMEPLAN-v3.html` §1–§3. Keys are the `portfolio:` values in `_data/publications.yml`.

| # | Portfolio | Key | Color (light) | Role |
|---|-----------|-----|---------------|------|
| 01 | (Countering) authoritarian propaganda | `propaganda` | `#2A5599` | marquee |
| 02 | Business & democracy | `business` | `#B5791A` | marquee · gold spine · anchor #DEMCOR |
| 03 | Methods & Political Regimes Data Hub | `datahub` | `#0F87A6` | marquee · Datasets/Methods shelves |
| 04 | AI & tech for development cooperation | `aitech` | `#7B5BA6` | marquee · anchor Depolarization Toolkit |
| 05 | Democracy support & authoritarian durability | `durability` | `#2E8B57` | **the trunk** — widest by design, center hub |

Dark-ground portfolio variants (validated with the dataviz palette checker alongside the
light set; for any future dark surface): `#5B8FD9 / #BE8419 / #1E97B4 / #A47FD0 / #3D9A69`.
Portfolios are always direct-labeled; color is never the only encoding.

Guardrail: 05 takes only durability/democracy-defense work, never residuals. Residuals
live on the Work wall (`portfolio: []`) with an `earlier-work` tag where apt.

## Data model (axes)
- `type` — first-class field, renders as the badge and drives the type filter:
  `academic-thesis | academic-peer-review | academic-working-paper |
  academic-discussion-paper | academic-chapter | academic-file-drawer | policy-brief | oped`.
- `portfolio[]` — one or more of the five keys; `[]` = wall-only. Multi-membership is
  the visible bridge between portfolios (drawn as multiple hub edges in the network).
- `tags[]` — cross-cutting facets: `turkey`, `mena`, `experiment`, `polarization`,
  `civil-war`, `identity-politics`, `migration`, `refugees`, `dev-cooperation`,
  `policy-advice`, `earlier-work`, `personal`. (Region is a tag, not an axis.)
- `dataset: true|false` — renders the diamond node glyph and the Datasets shelf.
- `shelf: datasets|methods` — only for `datahub` items; drives the hub page shelves.
- `related:` — item-to-item links `[{id, rel}]`, defined ONCE on the derived/later item
  (e.g. 19→12 "policy-brief version of"); the renderer mirrors them onto both cards and
  draws them as gold dashed edges. Typical labels: policy-brief version of · distills ·
  features dataset · companion argument · early version of · grew into.
- `project:` — optional ref to `_data/projects.yml` key (`demcor | depol-toolkit | datahub`).
- Anchor projects are first-class objects in `_data/projects.yml`, rendered as lead cards
  on their portfolio pages and as ringed gold nodes in the network.
- New surfaces: `_data/highlights.yml` (dated milestone cards) and `_data/social.yml`
  (curated post cards, never an auto feed).

Adding anything = append one YAML block. Every view renders from `_data/`.

## Aesthetic — CYANOTYPE BLUEPRINT (light), from mockup A

### Palette
- Paper `#F4F7FA` with a faint 56px blueprint grid drawn in hairline `#D7E0E8`
  (two 1px linear-gradients, centered top); card surface `#FBFCFD`.
- Ink text `#16263A`; muted `#5E7186`; hairline/borders `#D7E0E8`; chip ground `#E7EEF4`.
- Cobalt (primary ink, links, section kickers): `#14507D`.
- Gold (single accent): `#C2871C` — reserved for: related-edges, project nodes, anchor
  lines on cards, highlight dates, kickers' `+` prefix, the disclaimer line. On dark
  strips (compare bar / any future dark surface) gold text lightens to `#E9C07E`.
- The five portfolio hues (table above) are the ONLY other colors; they appear on hub
  circles, node fills, card top-borders, chip dots, and panel portfolio chips.
- Wall/earlier-work nodes: `#9AAAB9` at 0.55 fill-opacity.

### Type
- Space Grotesk 400/500/600 — display, headings, body, node hub labels.
- IBM Plex Mono 400/500 — kickers, nav, chips, badges, counts, dates, footer, axis text.
- Google Fonts with `preconnect`. No serif anywhere.

### Motifs
1. Anchored-hub network constellation (never force-directed).
2. Drafting registration `+` marks in the hero corners; blueprint grid ground.
3. Mono uppercase kickers with letter-spacing; `+ ` gold prefix on section kickers.
4. Hairline 1px borders; flat fills; square corners.

## Network hero (the signature component)

- SVG `viewBox="0 0 1200 640"`, full-bleed in a bordered card; renders entirely from
  data (Liquid emits JSON shaped like the mockup's `ITEMS`/`PF`/`PROJECTS` arrays).
- **Hub geometry (locked):** 05 at center `(600,290)`; 01 `(445,125)`; 02 `(975,150)`;
  03 `(255,455)`; 04 `(945,455)`. Hub = 26r circle at 0.12 fill-opacity + 7r solid core,
  two-line Space Grotesk label below, mono `01`–`05` tag above.
- **Nodes:** single-portfolio items ring their hub (deterministic hash jitter, r 70–115);
  multi-portfolio items sit at the weighted centroid of their hubs (first portfolio
  weighted 1.25) — the visible bridges. Circle 6.5r = paper/brief/op-ed; rotated square
  (diamond, 11px) = `dataset: true`; both with 1.5px `#FBFCFD` stroke. 13r transparent
  hit-target circle on every node.
- **Wall arc:** wall-only items as faded 4r dots evenly spaced on y=592, with the mono
  caption "EARLIER WORK · 2011–2023 · LIVES ON THE WORK WALL" (adjust years from data).
- **Edges:** node→hub lines in the hub color at 0.20 opacity (0.85 on hover, 0.07 others);
  `related:` links as gold `#C2871C` dashed `4 4` at 0.55; project→hub gold solid at 0.5.
- **Project nodes:** ringed gold (11r ring + 4.5r core), mono label above.
- **Interaction:** hover → detail panel top-right (300px, cobalt left border: type/year
  kicker, title, venue+coauthors, blurb, related lines, portfolio chips) + edge highlight;
  click → open item URL. Filter chips under the hero: All / Journal articles / Working &
  discussion papers / Policy briefs & reports / Op-eds & essays / Datasets, plus five
  portfolio dot-chips; non-matching nodes fade to 0.12 opacity.
- **Mobile (≤980px):** hero head goes static above the SVG; detail panel hidden (tap =
  open URL); layout is the responsive grid collapse from the mockup.
- Layout is deterministic (hash-jittered, seeded by id) so positions are stable across
  builds. Clamp nodes to x 50–1150, y 56–612.

## Page composition — home (locked order)
1. Header: name + mono role line; mono nav (Portfolios / Work / Teaching / About / CV).
2. Hero: network card with registration marks, hero head (kicker "Research map · N
   outputs · 5 programs", h1 spine line, hover hint), chips, panel.
3. "Five programs" — 5 portfolio cards: mono number (05 gets "· THE TRUNK" and a faint
   green gradient), title, blurb, gold anchor line, cobalt "N works →" count.
4. "Highlights / Recent" — horizontal scroll of dated cards from `highlights.yml`.
5. "Playable finding" — two-column card: framing + script buttons left, outcome bars
   right. **Magnitudes stay placeholder-labeled (gold mono disclaimer) until wired to
   replication estimates in Phase 4.**
6. "Latest" — 6-row stream, all types in one list: year · type badge · title · venue.
7. Footer: copyright · affiliation · social links.

Portfolio pages (Phase 3): ~120-word narrative → anchor project lead card (02, 04, 03)
→ flagships → interactive slot → interleaved stream → cross-portfolio bridges. Data Hub
page adds Datasets / Methods shelves from `shelf:`. Work wall: full corpus, filter by
type × portfolio × tag × year.

## Won't do (hard rules, carried forward)
- No cream/beige ground; no rusty-orange/coral accent; no purple accents outside the
  locked `aitech` hue; no rainbow beyond the five validated portfolio hues.
- No large italic display serifs; no ticker bars; no gradients/drop shadows/glow
  (the trunk card's faint two-stop surface tint is the sole exception).
- No force-directed hairball — hubs anchored and labeled, layout deterministic.
- Never publish placeholder finding magnitudes unlabeled; never invent citation authors.
- No AI-tells in copy (no em-dashes, no delve/leverage/pivotal vocabulary).
- Academic and policy work interleave in one stream; never split into separate sections.

## Build plan (Phase 3+)
1. `_sass/`: `_tokens.scss` (palette, type, grid ground), `_base.scss`, components
   (`_hero.scss`, `_cards.scss`, `_finding.scss`, `_latest.scss`, …).
2. Layouts + includes: `network-hero.html`, `portfolio-cards.html`, `highlights.html`,
   `finding.html`, `latest.html`; data emitted to JSON via Liquid `jsonify`.
3. JS modules (vanilla, GitHub-Pages-safe): `network.js` (render + hover + chips),
   `finding.js`, `wall.js`. No npm, no build plugins.
4. Portfolio pages, wall, teaching; replace the Bulma theme; old URLs persist/redirect.
5. Phase 4 interactives (real finding magnitudes, DERTT browser); Phase 5 update
   workflow + launch checklist per `_design/GAMEPLAN-v3.html` §7.

Preview: `website-mockups` server (port 4173) for static files; full site needs local
`jekyll`/`bundler` or CI build on push. The Browser pane cannot scroll `file://` pages.
