/* Activity archive — chip filters over the server-rendered highlight and post
   cards (user decision 2026-07-19: Work-wall idiom; both sections filter by
   Year × Type × Portfolio — highlights' data-k comes from highlights.yml
   `kind`, posts' from social.yml `type`). Facet groups AND-combine, one
   selection per group, exactly like wall.js; this script only builds the chip
   rows from the cards' data-* attributes and toggles visibility, so the card
   markup stays server-side. data-pf holds a space-separated list (a card can
   belong to several portfolios); portfolio chip metadata (short name + color)
   comes from the #act-pf JSON on the page. Each section shows at most CAP
   matching cards until its "Show N more" button expands it (user decision
   2026-07-19); changing any filter collapses the section again. */
(function () {
  "use strict";
  var CAP = 12;
  var pfEl = document.getElementById("act-pf");
  var PF = pfEl ? JSON.parse(pfEl.textContent) : [];

  /* ?pf=<key> preselects that portfolio chip in both sections (portfolio pages'
     "All N posts from this portfolio" links arrive here) */
  var initPf = null;
  try { initPf = new URLSearchParams(window.location.search).get("pf"); } catch (e) {}
  if (initPf && !PF.some(function (p) { return p.key === initPf; })) initPf = null; // unknown/malformed ?pf= must not reach querySelector

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* distinct data-<attr> values in card order (cards are newest-first) */
  function distinct(cards, attr) {
    var seen = [];
    cards.forEach(function (c) {
      var v = c.dataset[attr] || "";
      if (v && seen.indexOf(v) === -1) seen.push(v);
    });
    return seen;
  }

  /* portfolio chip options for a card set: dot + short name for every portfolio
     present in the cards' (space-separated) data-pf, in site order; cards with
     an empty data-pf get a "General" chip */
  function pfFacetOpts(cards) {
    var present = {};
    cards.forEach(function (c) {
      var v = (c.dataset.pf || "").trim();
      if (!v) { present[""] = true; return; }
      v.split(/\s+/).forEach(function (k) { present[k] = true; });
    });
    var opts = PF.filter(function (p) { return present[p.key]; }).map(function (p) {
      return [p.key, '<span class="dot" style="background:' + esc(p.color) + '"></span>' + esc(p.short)];
    });
    if (present[""]) opts.push(["none", "General"]);
    return opts;
  }

  /* year chip options, same rule as the wall: the 5 most recent years get
     their own chips; older years collapse into one range chip (value
     "lt:<cutoff>") so the row stays short as years accrue. Only bucket when
     the tail has at least 2 years. */
  var YEAR_SHOWN = 5;
  function yearFacetOpts(cards) {
    var ys = distinct(cards, "y").sort().reverse();
    var opts = ys.map(function (y) { return [y, y]; });
    if (ys.length > YEAR_SHOWN + 1) {
      var head = ys.slice(0, YEAR_SHOWN);
      var tail = ys.slice(YEAR_SHOWN);
      opts = head.map(function (y) { return [y, y]; })
        .concat([["lt:" + head[YEAR_SHOWN - 1], tail[tail.length - 1] + "–" + tail[0]]]);
    }
    return opts;
  }

  /* facets: [{group, label, attr, multi, opts: [[value, labelHTML]]}] — an "All"
     chip is prepended to every group; value "none" matches cards with an empty
     attr; multi: true matches against the attr's space-separated tokens */
  function wire(filtersId, countId, cards, noun, facets, presets) {
    var filtersEl = document.getElementById(filtersId);
    var countEl = document.getElementById(countId);
    if (!filtersEl || !countEl || !cards.length) return;

    var state = {};
    var expanded = false;
    facets.forEach(function (f) {
      state[f.group] = "all";
      var wrap = document.createElement("div");
      wrap.className = "fgroup";
      var lab = document.createElement("span");
      lab.className = "flabel";
      lab.textContent = f.label;
      wrap.appendChild(lab);
      [["all", "All"]].concat(f.opts).forEach(function (opt, i) {
        var b = document.createElement("button");
        b.className = "chip" + (i === 0 ? " on" : "");
        b.dataset.group = f.group;
        b.dataset.v = opt[0];
        b.innerHTML = opt[1];
        wrap.appendChild(b);
      });
      filtersEl.appendChild(wrap);
    });

    /* "Show N more" sits after the card grid; a filter change re-collapses */
    var grid = cards[0].parentNode;
    var moreBtn = document.createElement("button");
    moreBtn.type = "button";
    moreBtn.className = "act-more mono";
    grid.parentNode.insertBefore(moreBtn, grid.nextSibling);
    moreBtn.addEventListener("click", function () {
      expanded = true;
      render();
    });

    filtersEl.addEventListener("click", function (e) {
      var b = e.target.closest(".chip");
      if (!b) return;
      state[b.dataset.group] = b.dataset.v;
      filtersEl.querySelectorAll('.chip[data-group="' + b.dataset.group + '"]').forEach(function (c) { c.classList.remove("on"); });
      b.classList.add("on");
      expanded = false;
      render();
    });

    function render() {
      var hits = 0;
      var shown = 0;
      cards.forEach(function (c) {
        var hit = facets.every(function (f) {
          var v = state[f.group];
          if (v === "all") return true;
          var got = (c.dataset[f.attr] || "").trim();
          if (v === "none") return got === "";
          // "lt:<y>" is the bucketed earlier-years chip
          if (v.indexOf("lt:") === 0) return parseInt(got, 10) < parseInt(v.slice(3), 10);
          return f.multi ? got.split(/\s+/).indexOf(v) !== -1 : got === v;
        });
        if (hit) {
          hits += 1;
          var visible = expanded || hits <= CAP;
          c.style.display = visible ? "" : "none";
          if (visible) shown += 1;
        } else {
          c.style.display = "none";
        }
      });
      countEl.textContent = "SHOWING " + shown + " OF " + cards.length + " " + noun;
      var hidden = hits - shown;
      moreBtn.textContent = "Show " + hidden + " more";
      moreBtn.style.display = hidden > 0 ? "" : "none";
    }

    /* apply presets (e.g. ?pf=) before the first render: flip the matching chip
       on and the group's "All" chip off; unknown values fall back to "all" */
    Object.keys(presets || {}).forEach(function (g) {
      var v = presets[g];
      if (!v) return;
      var chip = filtersEl.querySelector('.chip[data-group="' + g + '"][data-v="' + v + '"]');
      if (!chip) return;
      state[g] = v;
      filtersEl.querySelectorAll('.chip[data-group="' + g + '"]').forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on");
    });
    render();
  }

  /* highlights: Year × Type × Portfolio */
  var hlCards = Array.prototype.slice.call(document.querySelectorAll("#highlights .hl > article"));
  wire("hl-filters", "hl-count", hlCards, "HIGHLIGHTS", [
    { group: "y", label: "Year", attr: "y", opts: yearFacetOpts(hlCards) },
    { group: "k", label: "Type", attr: "k",
      opts: distinct(hlCards, "k").map(function (k) { return [k, esc(cap(k))]; }) },
    { group: "pf", label: "Portfolio", attr: "pf", multi: true, opts: pfFacetOpts(hlCards) }
  ], { pf: initPf });

  /* posts: Year × Type × Portfolio */
  var poCards = Array.prototype.slice.call(document.querySelectorAll("#posts .fn > .fncard"));
  wire("po-filters", "po-count", poCards, "POSTS", [
    { group: "y", label: "Year", attr: "y", opts: yearFacetOpts(poCards) },
    { group: "k", label: "Type", attr: "k",
      opts: distinct(poCards, "k").map(function (k) { return [k, esc(cap(k))]; }) },
    { group: "pf", label: "Portfolio", attr: "pf", multi: true, opts: pfFacetOpts(poCards) }
  ], { pf: initPf });
})();
