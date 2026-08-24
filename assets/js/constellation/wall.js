/* Work wall — spec v3. Filters the full corpus with five AND-combined facet
   groups (type × method × portfolio × tag × year), one selection per group.
   Type and method groups match the network hero's chips for consistency.

   2026-08-24: the rows are no longer built here. c-wall.html renders all of
   them server-side so a crawler sees the whole corpus, and this module reads
   their data-* attributes and toggles display, like activity.js does with its
   cards. The #c-data JSON is still the source for the chips and for the exact
   row order. */
(function () {
  "use strict";
  const dataEl = document.getElementById("c-data");
  const filtersEl = document.getElementById("wall-filters");
  const rowsEl = document.getElementById("wall-rows");
  const countEl = document.getElementById("wall-count");
  if (!dataEl || !filtersEl || !rowsEl) return;
  const ROWS = Array.prototype.slice.call(rowsEl.querySelectorAll(".wall-row"));
  if (!ROWS.length) return;

  const DATA = JSON.parse(dataEl.textContent);
  // newest first; within a year, exact dates (optional month/day) rank above
  // year-only items, which sink to the bottom of their year
  const ITEMS = DATA.items.slice().sort((a, b) =>
    b.year - a.year || (b.month || 0) - (a.month || 0) || (b.day || 0) - (a.day || 0) || b.id - a.id);
  const METHODS = DATA.methods || []; // [{key, label}] from _data/portfolios.yml
  const PF = {};
  DATA.portfolios.forEach(p => { PF[p.key] = p; });

  /* Liquid can only sort on one key, so it emits the rows in year order.
     Put them in the exact year > month > day > id order here. */
  const BY_ID = {};
  ROWS.forEach(r => { BY_ID[r.dataset.id] = r; });
  ITEMS.forEach(it => { const r = BY_ID[String(it.id)]; if (r) rowsEl.appendChild(r); });

  const TYPE_GROUPS = {
    peer: ["academic-peer-review"],
    wpdp: ["academic-working-paper", "academic-discussion-paper", "academic-file-drawer"],
    book: ["academic-thesis", "academic-chapter"],
    pb: ["policy-brief", "report"],
    oped: ["oped", "essay"]
  };

  /* facet definitions: [group key, label, options as [value, label]] */
  const years = [...new Set(ITEMS.map(i => i.year))].sort((a, b) => b - a);
  /* the 5 most recent years get their own chips; older years collapse into one
     range chip (value "lt:<cutoff>") so the row stays short as years accrue.
     Only bucket when the tail has at least 2 years. */
  const YEAR_SHOWN = 5;
  let yearOpts = years.map(y => [String(y), String(y)]);
  if (years.length > YEAR_SHOWN + 1) {
    const head = years.slice(0, YEAR_SHOWN);
    const tail = years.slice(YEAR_SHOWN);
    yearOpts = head.map(y => [String(y), String(y)])
      .concat([["lt:" + head[YEAR_SHOWN - 1], tail[tail.length - 1] + "–" + tail[0]]]);
  }
  const usedTags = new Set();
  ROWS.forEach(r => attr(r, "tag").forEach(t => usedTags.add(t)));
  const facets = [
    ["type", "Type", [["all", "All"], ["peer", "Journal articles"], ["wpdp", "Working & discussion papers"], ["book", "Books & book chapters"], ["pb", "Policy briefs & reports"], ["oped", "Op-eds & essays"], ["ds", "Datasets"]]],
    ["m", "Method", [["all", "All"]].concat(METHODS.map(m => [m.key, m.label]))],
    ["pf", "Portfolio", [["all", "All"]]
      .concat(DATA.portfolios.map(p => [p.key, p.num + " " + p.short]))
      .concat([["wall", "Other"]])],
    ["tag", "Tag", [["all", "All"]].concat(DATA.tags.filter(t => usedTags.has(t.key)).map(t => [t.key, t.label]))],
    ["year", "Year", [["all", "All"]].concat(yearOpts)]
  ];

  const state = { type: "all", m: "all", pf: "all", tag: "all", year: "all" };

  facets.forEach(([group, label, opts]) => {
    const wrap = document.createElement("div");
    wrap.className = "fgroup";
    const lab = document.createElement("span");
    lab.className = "flabel";
    lab.textContent = label;
    wrap.appendChild(lab);
    opts.forEach(([v, l], i) => {
      const b = document.createElement("button");
      b.className = "chip" + (i === 0 ? " on" : "");
      b.dataset.group = group;
      b.dataset.v = v;
      if (group === "pf" && v !== "all" && v !== "wall") {
        b.innerHTML = '<span class="dot" style="background:' + PF[v].color + '"></span>' + l;
      } else {
        b.textContent = l;
      }
      wrap.appendChild(b);
    });
    filtersEl.appendChild(wrap);
  });

  /* "Show N more" caps the list like the activity page (same CAP and button
     style); changing any filter collapses it again */
  const CAP = 12;
  let expanded = false;
  const moreBtn = document.createElement("button");
  moreBtn.type = "button";
  moreBtn.className = "act-more mono";
  rowsEl.parentNode.insertBefore(moreBtn, rowsEl.nextSibling);
  moreBtn.addEventListener("click", () => {
    expanded = true;
    render();
  });

  filtersEl.addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    state[b.dataset.group] = b.dataset.v;
    filtersEl.querySelectorAll('.chip[data-group="' + b.dataset.group + '"]').forEach(c => c.classList.remove("on"));
    b.classList.add("on");
    expanded = false;
    render();
  });

  /* space-joined data-* list -> array ("" -> []) */
  function attr(row, name) {
    const v = (row.dataset[name] || "").trim();
    return v ? v.split(/\s+/) : [];
  }

  function matches(row) {
    const d = row.dataset;
    if (state.type !== "all") {
      if (state.type === "ds") { if (d.ds !== "1") return false; }
      else if (!TYPE_GROUPS[state.type].includes(d.type)) return false;
    }
    if (state.m !== "all" && !attr(row, "m").includes(state.m)) return false;
    const pfs = attr(row, "pf");
    if (state.pf === "wall") { if (pfs.length) return false; }
    else if (state.pf !== "all" && !pfs.includes(state.pf)) return false;
    if (state.tag !== "all" && !attr(row, "tag").includes(state.tag)) return false;
    if (state.year !== "all") {
      // "lt:<y>" is the bucketed earlier-years chip
      if (state.year.indexOf("lt:") === 0) { if (+d.year >= +state.year.slice(3)) return false; }
      else if (d.year !== state.year) return false;
    }
    return true;
  }

  function render() {
    let hits = 0, shown = 0;
    ROWS.forEach(r => {
      if (!matches(r)) { r.style.display = "none"; return; }
      hits += 1;
      const visible = expanded || hits <= CAP;
      r.style.display = visible ? "" : "none";
      if (visible) shown += 1;
    });
    countEl.textContent = "SHOWING " + shown + " OF " + ROWS.length + " OUTPUTS";
    const hidden = hits - shown;
    moreBtn.textContent = "Show " + hidden + " more";
    moreBtn.style.display = hidden > 0 ? "" : "none";
  }

  render();
})();
