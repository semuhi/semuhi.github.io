/* Work wall — spec v3. Renders the full corpus from the #c-data JSON with five
   AND-combined facet groups (type × method × portfolio × tag × year), one
   selection per group. Type and method groups match the network hero's chips
   for consistency. */
(function () {
  "use strict";
  const dataEl = document.getElementById("c-data");
  const filtersEl = document.getElementById("wall-filters");
  const rowsEl = document.getElementById("wall-rows");
  const countEl = document.getElementById("wall-count");
  if (!dataEl || !filtersEl || !rowsEl) return;

  const DATA = JSON.parse(dataEl.textContent);
  // newest first; within a year, exact dates (optional month/day) rank above
  // year-only items, which sink to the bottom of their year
  const ITEMS = DATA.items.slice().sort((a, b) =>
    b.year - a.year || (b.month || 0) - (a.month || 0) || (b.day || 0) - (a.day || 0) || b.id - a.id);
  const TYPE_LABELS = DATA.typeLabels;
  const METHODS = DATA.methods || []; // [{key, label}] from _data/portfolios.yml
  const METHOD_LABELS = {};
  METHODS.forEach(m => { METHOD_LABELS[m.key] = m.label; });
  const PF = {};
  DATA.portfolios.forEach(p => { PF[p.key] = p; });

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
  ITEMS.forEach(i => (i.tags || []).forEach(t => usedTags.add(t)));
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

  function matches(it) {
    if (state.type !== "all") {
      if (state.type === "ds") { if (!it.dataset) return false; }
      else if (!TYPE_GROUPS[state.type].includes(it.type)) return false;
    }
    if (state.m !== "all" && !(it.methods || []).includes(state.m)) return false;
    const pfs = it.portfolio || [];
    if (state.pf === "wall") { if (pfs.length) return false; }
    else if (state.pf !== "all" && !pfs.includes(state.pf)) return false;
    if (state.tag !== "all" && !(it.tags || []).includes(state.tag)) return false;
    if (state.year !== "all") {
      // "lt:<y>" is the bucketed earlier-years chip
      if (state.year.indexOf("lt:") === 0) { if (it.year >= +state.year.slice(3)) return false; }
      else if (String(it.year) !== state.year) return false;
    }
    return true;
  }

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function render() {
    const hits = ITEMS.filter(matches);
    const shown = expanded ? hits : hits.slice(0, CAP);
    countEl.textContent = "SHOWING " + shown.length + " OF " + ITEMS.length + " OUTPUTS";
    const hidden = hits.length - shown.length;
    moreBtn.textContent = "Show " + hidden + " more";
    moreBtn.style.display = hidden > 0 ? "" : "none";
    rowsEl.innerHTML = shown.map(it => {
      const pfs = it.portfolio || [];
      const color = pfs.length ? PF[pfs[0]].color : "#9AAAB9";
      const dots = pfs.length
        ? pfs.map(k => '<span class="pdot" style="color:' + PF[k].color + '" title="' + esc(PF[k].title) + '">' + PF[k].num + "</span>").join("")
        : '<span class="pdot wallonly">other</span>';
      const title = esc(it.title);
      const t = it.url
        ? '<a class="t" href="' + esc(it.url) + '" target="_blank" rel="noopener">' + title + "</a>"
        : '<span class="t">' + title + "</span>";
      // a per-item kicker ("IDOS Policy brief") becomes the badge and swallows
      // the numbered venue ("IDOS Policy Brief 17/2026"), mirroring the map card;
      // otherwise a venue that only repeats the type badge is dropped
      const badge = it.kicker || TYPE_LABELS[it.type];
      const metaParts = [];
      if (it.venue && !it.kicker && it.venue.toLowerCase() !== TYPE_LABELS[it.type].toLowerCase()) metaParts.push(esc(it.venue));
      if (it.coauthors) metaParts.push("with " + esc(it.coauthors));
      // methods stay a filter facet only; the rows don't repeat them
      const meta = metaParts.join(" · ");
      return '<div class="row wall-row">' +
        '<span class="yr">' + it.year + "</span>" +
        '<span class="badge">' + badge + "</span>" +
        '<span class="main">' + t + '<span class="meta">' + meta + "</span></span>" +
        '<span class="pfs">' + dots + "</span></div>";
    }).join("");
  }

  render();
})();
