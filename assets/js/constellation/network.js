/* Constellation network hero — spec v3 (locked from mockup A).
   Renders the SVG research map from the JSON emitted by _includes/c-data.html:
   {items, portfolios, typeLabels, projects} straight from _data/.
   Layout is deterministic (hash-jittered by id) so positions are stable.
   Interaction model: hover previews a card, click pins it (click the node again
   or the map background to close); hub centers pin the program card, which links
   to the portfolio page; the legend lists short portfolio names on their own row
   and dims everything else while one is active (click again to clear). Nodes
   drift a few px around their anchors unless the user prefers reduced motion. */
(function () {
  "use strict";
  const dataEl = document.getElementById("c-data");
  const svg = document.getElementById("net");
  if (!dataEl || !svg) return;

  const DATA = JSON.parse(dataEl.textContent);
  const ITEMS = DATA.items;
  const TYPE_LABELS = DATA.typeLabels;
  const METHODS = DATA.methods || []; // [{key, label}] from _data/portfolios.yml
  const METHOD_LABELS = {};
  METHODS.forEach(m => { METHOD_LABELS[m.key] = m.label; });
  const PF = {}; // by key
  DATA.portfolios.forEach(p => { PF[p.key] = p; });
  /* Portfolio page URL pattern: the fixture and the real site differ, so the
     include carries it as data-pf-href with a {key} placeholder. */
  const PF_HREF = svg.dataset.pfHref || "/portfolios/{key}/";
  const pfHref = k => PF_HREF.replace("{key}", k);

  const isWall = it => !it.portfolio || it.portfolio.length === 0;

  /* ---------- deterministic layout ---------- */
  function hash(n) { return ((n * 2654435761) % 4294967296) / 4294967296; }
  const nodes = {};
  const byHub = {};
  ITEMS.forEach(it => { if (!isWall(it)) it.portfolio.forEach(k => (byHub[k] = byHub[k] || []).push(it.id)); });
  const wallItems = ITEMS.filter(isWall);
  /* the grey "Miscellaneous" cluster (no number by design) sits in the gap
     between the 02 and 06 hubs: a central connector dot with three spokes,
     its label below the cluster */
  const MISC = { x: 1055, y: 306 };
  const MISC_LABEL = { x: 1055, y: 372 };
  const MISC_SPOTS = [[1055, 248], [1000, 340], [1110, 340]];
  ITEMS.forEach(it => {
    if (isWall(it)) {
      const s = MISC_SPOTS[wallItems.indexOf(it) % MISC_SPOTS.length];
      nodes[it.id] = { x: s[0], y: s[1], wall: true };
    } else if (it.portfolio.length === 1) {
      const k = it.portfolio[0], hub = PF[k];
      const ring = byHub[k].filter(id => ITEMS.find(i => i.id === id).portfolio.length === 1);
      const idx = ring.indexOf(it.id);
      const a = (idx / ring.length) * Math.PI * 2 + hash(it.id) * 0.5 + (k === "durability" ? 0.4 : 2.1);
      const r = 70 + hash(it.id + 7) * 45;
      nodes[it.id] = { x: hub.hub_x + Math.cos(a) * r * 1.25, y: hub.hub_y + Math.sin(a) * r * 0.9 };
    } else {
      let sx = 0, sy = 0, w = 0;
      it.portfolio.forEach((k, i) => {
        const wt = i === 0 ? 1.25 : 1;
        sx += PF[k].hub_x * wt; sy += PF[k].hub_y * wt; w += wt;
      });
      nodes[it.id] = { x: sx / w + (hash(it.id) - 0.5) * 90, y: sy / w + (hash(it.id + 3) - 0.5) * 70 };
    }
  });
  /* Keep item nodes out of every hub's title block (two text lines under the
     hub, ~hub_y+30..+72, half-width 100 incl. drift amplitude) and out of the
     Miscellaneous caption: push horizontally past the label, keeping its side. */
  function keepOutOfLabels(n) {
    if (!n.wall) {
      DATA.portfolios.forEach(h => {
        const dx = n.x - h.hub_x;
        if (Math.abs(dx) < 100 && n.y > h.hub_y + 28 && n.y < h.hub_y + 72) {
          n.x = h.hub_x + (dx >= 0 ? 112 : -112);
        }
      });
      const dxm = n.x - MISC_LABEL.x;
      if (Math.abs(dxm) < 70 && n.y > MISC_LABEL.y - 16 && n.y < MISC_LABEL.y + 12) {
        n.x = MISC_LABEL.x + (dxm >= 0 ? 80 : -80);
      }
    }
    n.x = Math.max(50, Math.min(1150, n.x));
    n.y = Math.max(56, Math.min(612, n.y));
  }
  /* Collision pass: no two item nodes closer than MIN_D (hit targets are r13
     and drift adds up to ~8px between two nodes), none inside a hub circle or
     a project ring. Deterministic relaxation; obstacles are fixed. */
  const MIN_D = 27;
  const obstacles = [];
  DATA.portfolios.forEach(h => obstacles.push({ x: h.hub_x, y: h.hub_y, d: 50 }));
  DATA.projects.forEach(pr => { if (pr.net_x != null) obstacles.push({ x: pr.net_x, y: pr.net_y, d: 30 }); });
  obstacles.push({ x: MISC.x, y: MISC.y, d: 34 }); // the Miscellaneous connector dot
  const allIds = ITEMS.map(i => i.id);
  for (let pass = 0; pass < 50; pass++) {
    let moved = false;
    for (let i = 0; i < allIds.length; i++) {
      const a = nodes[allIds[i]];
      obstacles.forEach(o => {
        const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy) || 0.01;
        if (d < o.d) { a.x = o.x + dx / d * o.d; a.y = o.y + dy / d * o.d; moved = true; }
      });
      for (let j = i + 1; j < allIds.length; j++) {
        const b = nodes[allIds[j]];
        let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d >= MIN_D) continue;
        if (d < 0.01) { dx = hash(allIds[i] + allIds[j]) - 0.5; dy = 0.3; d = Math.hypot(dx, dy); }
        const push = (MIN_D - d) / 2 / d;
        a.x -= dx * push; a.y -= dy * push;
        b.x += dx * push; b.y += dy * push;
        moved = true;
      }
    }
    Object.values(nodes).forEach(keepOutOfLabels);
    if (!moved) break;
  }

  /* ---------- render svg ---------- */
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  const gEdges = el("g", {}), gRel = el("g", {}), gMisc = el("g", {}), gHubs = el("g", {}), gNodes = el("g", {});

  // node -> hub edges (tagged with hub key so the legend can dim by portfolio)
  const hubEdges = []; // {line, id} — x1/y1 follow the drifting node
  ITEMS.forEach(it => {
    if (isWall(it)) return;
    it.portfolio.forEach(k => {
      hubEdges.push({
        line: el("line", {
          x1: nodes[it.id].x, y1: nodes[it.id].y, x2: PF[k].hub_x, y2: PF[k].hub_y,
          stroke: PF[k].color, "stroke-opacity": 0.20, "stroke-width": 1, "data-edge": it.id, "data-pf": k, class: "edge"
        }, gEdges),
        id: it.id
      });
    });
  });
  // related edges (red, dashed) — draw each pair once; both endpoints drift
  const relEdges = []; // {line, a, b}
  const seenRel = new Set();
  ITEMS.forEach(it => (it.related || []).forEach(r => {
    const key = [Math.min(it.id, r.id), Math.max(it.id, r.id)].join("-");
    if (seenRel.has(key) || !nodes[r.id]) return;
    seenRel.add(key);
    relEdges.push({
      line: el("line", {
        x1: nodes[it.id].x, y1: nodes[it.id].y, x2: nodes[r.id].x, y2: nodes[r.id].y,
        stroke: "#C0392B", "stroke-opacity": 0.55, "stroke-width": 1.2, "stroke-dasharray": "4 4"
      }, gRel),
      a: it.id, b: r.id
    });
  }));
  // item -> project related edges (red, dashed — same style as item-item
  // related): `related_project:` on the item; the project end is fixed
  const relProjEdges = []; // {line, id, projpf} — x1/y1 follow the drifting item
  ITEMS.forEach(it => {
    if (!it.related_project) return;
    const pr = DATA.projects.find(p => p.key === it.related_project);
    if (!pr || pr.net_x == null) return;
    relProjEdges.push({
      line: el("line", {
        x1: nodes[it.id].x, y1: nodes[it.id].y, x2: pr.net_x, y2: pr.net_y,
        stroke: "#C0392B", "stroke-opacity": 0.55, "stroke-width": 1.2, "stroke-dasharray": "4 4"
      }, gRel),
      id: it.id, projpf: pr.portfolio
    });
  });
  // item -> project edges (short-dashed, in the project's portfolio color):
  // an item with `project:` links straight to its anchor-project ring
  const projEdges = []; // {line, id, projpf} — x1/y1 follow the drifting item
  ITEMS.forEach(it => {
    if (!it.project) return;
    const pr = DATA.projects.find(p => p.key === it.project);
    if (!pr || pr.net_x == null) return;
    projEdges.push({
      line: el("line", {
        x1: nodes[it.id].x, y1: nodes[it.id].y, x2: pr.net_x, y2: pr.net_y,
        stroke: PF[pr.portfolio].color, "stroke-opacity": 0.45, "stroke-width": 1.2,
        "stroke-dasharray": "2 3", class: "pedge", "data-edge": it.id, "data-proj": pr.key
      }, gRel),
      id: it.id, projpf: pr.portfolio
    });
  });
  // hubs — one group per hub so it can be clicked (program card) and dimmed
  DATA.portfolios.forEach(h => {
    const g = el("g", { "data-hub": h.key, style: "cursor:pointer" }, gHubs);
    el("circle", { cx: h.hub_x, cy: h.hub_y, r: 26, fill: h.color, "fill-opacity": 0.12, stroke: h.color, "stroke-width": 1.5 }, g);
    el("circle", { cx: h.hub_x, cy: h.hub_y, r: 7, fill: h.color }, g);
    const t = el("text", { x: h.hub_x, y: h.hub_y + 44, "text-anchor": "middle", fill: h.color, style: "font:600 12.5px 'Space Grotesk';letter-spacing:.02em" }, g);
    const words = h.title.split(" ");
    el("tspan", { x: h.hub_x, dy: 0 }, t).textContent = words.slice(0, Math.ceil(words.length / 2)).join(" ");
    el("tspan", { x: h.hub_x, dy: 14 }, t).textContent = words.slice(Math.ceil(words.length / 2)).join(" ");
    el("text", { x: h.hub_x, y: h.hub_y - 34, "text-anchor": "middle", fill: h.color, style: "font:500 10px 'IBM Plex Mono';letter-spacing:.15em" }, g).textContent = h.num;
    el("circle", { cx: h.hub_x, cy: h.hub_y, r: 26, fill: "transparent" }, g); // solid hit target
  });
  // project nodes (ringed, in their portfolio's color, clickable like hubs);
  // skip those without coordinates
  DATA.projects.forEach(pr => {
    if (pr.net_x == null) return;
    const hub = PF[pr.portfolio], c = hub.color;
    const g = el("g", { "data-projpf": pr.portfolio, "data-proj": pr.key, style: "cursor:pointer" }, gHubs);
    el("line", { x1: pr.net_x, y1: pr.net_y, x2: hub.hub_x, y2: hub.hub_y, stroke: c, "stroke-opacity": 0.5, "stroke-width": 1.4 }, g);
    el("circle", { cx: pr.net_x, cy: pr.net_y, r: 11, fill: "none", stroke: c, "stroke-width": 1.5 }, g);
    el("circle", { cx: pr.net_x, cy: pr.net_y, r: 4.5, fill: c }, g);
    el("text", { x: pr.net_x, y: pr.net_y - 18, "text-anchor": "middle", fill: c, style: "font:500 10.5px 'IBM Plex Mono';letter-spacing:.08em" }, g).textContent = pr.label;
    el("circle", { cx: pr.net_x, cy: pr.net_y, r: 16, fill: "transparent" }, g); // solid hit target
  });
  // item nodes (all circles; datasets carry a "· dataset" kicker + legend chip)
  const nodeEls = {}; // id -> g, for the drift transform
  ITEMS.forEach(it => {
    const n = nodes[it.id];
    const c = isWall(it) ? "#9AAAB9" : PF[it.portfolio[0]].color;
    const g = el("g", { "data-id": it.id, style: "cursor:pointer" }, gNodes);
    nodeEls[it.id] = g;
    el("circle", { cx: n.x, cy: n.y, r: 6.5, fill: c, "fill-opacity": 0.92, stroke: "#FBFCFD", "stroke-width": 1.5 }, g);
    el("circle", { cx: n.x, cy: n.y, r: 13, fill: "transparent" }, g); // hit target
  });
  // grey connector dot ties the three wall-only pieces into one cluster,
  // labeled like a hub title but unnumbered by design; dims with its items
  const miscEdges = []; // {line, id} — x1/y1 follow the drifting wall node
  if (wallItems.length) {
    wallItems.forEach(it => {
      miscEdges.push({
        line: el("line", { x1: nodes[it.id].x, y1: nodes[it.id].y, x2: MISC.x, y2: MISC.y, stroke: "#9AAAB9", "stroke-opacity": 0.5, "stroke-width": 1.2 }, gMisc),
        id: it.id
      });
    });
    el("circle", { cx: MISC.x, cy: MISC.y, r: 14, fill: "#9AAAB9", "fill-opacity": 0.12, stroke: "#9AAAB9", "stroke-width": 1.5 }, gMisc);
    el("circle", { cx: MISC.x, cy: MISC.y, r: 4.5, fill: "#9AAAB9" }, gMisc);
    el("text", { x: MISC_LABEL.x, y: MISC_LABEL.y, "text-anchor": "middle", fill: "#5E7186", style: "font:600 12.5px 'Space Grotesk';letter-spacing:.02em" }, gMisc)
      .textContent = "Miscellaneous";
  }

  /* ---------- panel (hover previews, click pins) ---------- */
  const panel = document.getElementById("panel");
  let pinned = null;      // {kind: "item", id} | {kind: "hub", key} | {kind: "proj", key} | null
  let hoverFreeze = false;
  const frozen = () => hoverFreeze || !!pinned;
  const byId = id => ITEMS.find(i => i.id == id);
  const projByKey = key => DATA.projects.find(p => p.key === key);

  // YAML-sourced URLs land inside double-quoted href attributes; blurbs stay raw by design
  const escAttr = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  function itemPanelHTML(it) {
    const color = isWall(it) ? "#9AAAB9" : PF[it.portfolio[0]].color;
    const chips = (isWall(it)
      ? "<span>other</span>"
      : it.portfolio.map(k => '<span style="color:' + PF[k].color + ";border-color:" + PF[k].color + '">' + PF[k].num + "</span>").join(""))
      + (it.methods || []).map(m => '<span class="m">' + METHOD_LABELS[m] + "</span>").join("");
    const link = it.url ? '<a class="go" href="' + escAttr(it.url) + '" target="_blank" rel="noopener">Open →</a>' : "";
    /* a per-item `kicker` ("IDOS Policy brief") replaces the type label on the
       map card and swallows the numbered venue line; coauthors still show.
       Otherwise a venue that only repeats the type kicker is dropped. */
    const kicker = it.kicker || TYPE_LABELS[it.type];
    const venueParts = [];
    if (it.venue && !it.kicker && it.venue.toLowerCase() !== TYPE_LABELS[it.type].toLowerCase()) venueParts.push(it.venue);
    if (it.coauthors) venueParts.push("with " + it.coauthors);
    const venue = venueParts.length ? '<div class="venue">' + venueParts.join(" · ") + "</div>" : "";
    return '<div class="ty" style="color:' + color + '">' + kicker + " · " + (it.year_display || it.year) + "</div>" +
      "<h3>" + (it.title_short || it.title) + "</h3>" + venue +
      '<div class="blurb">' + it.blurb + "</div>" +
      '<div class="pf">' + chips + "</div>" + link;
  }
  function hubPanelHTML(h) {
    const n = ITEMS.filter(i => !isWall(i) && i.portfolio.includes(h.key)).length;
    return '<div class="ty">Portfolio ' + h.num + " · " + n + " outputs</div>" +
      "<h3>" + h.title + "</h3>" +
      '<div class="blurb">' + h.blurb + "</div>" +
      (h.anchor ? '<div class="anchor">' + h.anchor + "</div>" : "") +
      '<a class="go" href="' + pfHref(h.key) + '">Open portfolio →</a>';
  }
  function projPanelHTML(pr) {
    const h = PF[pr.portfolio];
    const link = pr.url
      ? '<a class="go" href="' + escAttr(pr.url) + '" target="_blank" rel="noopener">Open →</a>'
      : '<a class="go" href="' + pfHref(pr.portfolio) + '">Open portfolio →</a>';
    // a bare "IDOS" host adds nothing on the map card (the portfolio-page lead
    // card keeps it); richer hosts ("IDOS with UNDP + DW Akademie") stay;
    // map_host overrides for cards whose host reads wrong on the map
    const mhost = pr.map_host || ((pr.host && pr.host !== "IDOS") ? pr.host : "");
    const venue = mhost ? '<div class="venue">' + mhost + "</div>" : "";
    const chips = [pr.portfolio].concat(pr.also || [])
      .map(k => '<span style="color:' + PF[k].color + ";border-color:" + PF[k].color + '">' + PF[k].num + "</span>").join("")
      + (pr.methods || []).map(m => '<span class="m">' + METHOD_LABELS[m] + "</span>").join("");
    return '<div class="ty" style="color:' + h.color + '">Initiative · ' + pr.years + "</div>" +
      "<h3>" + pr.title + "</h3>" + venue +
      // map card prefers the short map_blurb (long lead-card blurbs overflow
      // the pinned-card frame; user decision 2026-07-20)
      '<div class="blurb">' + (pr.map_blurb || pr.blurb) + "</div>" +
      '<div class="pf">' + chips + "</div>" + link;
  }
  function showItem(it) {
    panel.style.display = "block";
    panel.classList.remove("hub");
    panel.style.background = "";
    panel.style.borderLeftColor = isWall(it) ? "#9AAAB9" : PF[it.portfolio[0]].color;
    panel.innerHTML = itemPanelHTML(it);
  }
  // the program card gets the portfolio's own ground so it reads as a different
  // kind of card than the output panels (user decision, 2026-07-18)
  function showHub(h) {
    panel.style.display = "block";
    panel.classList.add("hub");
    panel.style.background = h.color;
    panel.style.borderLeftColor = "rgba(255,255,255,.55)";
    panel.innerHTML = hubPanelHTML(h);
  }
  // light tint of a hex color (mix toward white); project cards get a washed
  // version of their portfolio color so they sit between output cards (plain
  // ground) and program cards (solid portfolio ground)
  function tint(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    const mix = v => Math.round(v + (255 - v) * f);
    return "rgb(" + mix(n >> 16 & 255) + "," + mix(n >> 8 & 255) + "," + mix(n & 255) + ")";
  }
  function showProj(pr) {
    panel.style.display = "block";
    panel.classList.remove("hub");
    panel.style.background = tint(PF[pr.portfolio].color, 0.87);
    panel.style.borderLeftColor = PF[pr.portfolio].color;
    panel.innerHTML = projPanelHTML(pr);
  }
  function hidePanel() {
    panel.style.display = "none";
    panel.classList.remove("hub");
    panel.style.background = "";
    panel.style.borderLeftColor = "";
  }
  function highlightEdges(id) {
    document.querySelectorAll(".edge").forEach(l => l.setAttribute("stroke-opacity", l.dataset.edge == id ? 0.85 : 0.07));
    document.querySelectorAll(".pedge").forEach(l => l.setAttribute("stroke-opacity", l.dataset.edge == id ? 0.9 : 0.1));
  }
  function resetEdges() {
    document.querySelectorAll(".edge").forEach(l => l.setAttribute("stroke-opacity", 0.20));
    document.querySelectorAll(".pedge").forEach(l => l.setAttribute("stroke-opacity", 0.45));
  }
  function restorePinned() {
    if (!pinned) { hidePanel(); resetEdges(); return; }
    if (pinned.kind === "item") { const it = byId(pinned.id); showItem(it); highlightEdges(it.id); }
    else if (pinned.kind === "proj") { showProj(projByKey(pinned.key)); resetEdges(); }
    else { showHub(PF[pinned.key]); resetEdges(); }
  }

  svg.addEventListener("mouseover", e => {
    if (pinned) return; // a pinned card stays put; hover must not swap it out
    const gi = e.target.closest("g[data-id]");
    const gh = e.target.closest("g[data-hub]");
    const gp = e.target.closest("g[data-proj]");
    if (!gi && !gh && !gp) return;
    hoverFreeze = true;
    if (gi) { const it = byId(gi.dataset.id); highlightEdges(it.id); showItem(it); }
    else if (gp) showProj(projByKey(gp.dataset.proj));
    else showHub(PF[gh.dataset.hub]);
  });
  svg.addEventListener("mouseout", e => {
    if (pinned) return;
    if (!e.target.closest("g[data-id]") && !e.target.closest("g[data-hub]") && !e.target.closest("g[data-proj]")) return;
    hoverFreeze = false;
    restorePinned();
  });
  svg.addEventListener("click", e => {
    const gi = e.target.closest("g[data-id]");
    const gh = e.target.closest("g[data-hub]");
    const gp = e.target.closest("g[data-proj]");
    if (gi) {
      const id = +gi.dataset.id;
      pinned = (pinned && pinned.kind === "item" && pinned.id === id) ? null : { kind: "item", id };
    } else if (gh) {
      const key = gh.dataset.hub;
      pinned = (pinned && pinned.kind === "hub" && pinned.key === key) ? null : { kind: "hub", key };
    } else if (gp) {
      const key = gp.dataset.proj;
      pinned = (pinned && pinned.kind === "proj" && pinned.key === key) ? null : { kind: "proj", key };
    } else {
      pinned = null; // click on map whitespace closes the card
    }
    // hover events are ignored while pinned, so resync the freeze flag here
    if (!pinned) hoverFreeze = !!(gi || gh || gp);
    restorePinned();
  });

  /* ---------- legend: type chips + short-name portfolio chips ---------- */
  const TYPE_GROUPS = {
    peer: ["academic-peer-review"],
    wpdp: ["academic-working-paper", "academic-discussion-paper", "academic-file-drawer"],
    book: ["academic-thesis", "academic-chapter"],
    pb: ["policy-brief", "report"],
    oped: ["oped", "essay"]
  };
  const chipDefs = [["all", "All"], ["peer", "Journal articles"], ["wpdp", "Working & discussion papers"], ["book", "Books & book chapters"], ["pb", "Policy briefs & reports"], ["oped", "Op-eds & essays"], ["ds", "Datasets"]];
  const chipsEl = document.getElementById("chips");
  const typeRow = document.createElement("div");
  typeRow.className = "chip-row";
  const methodRow = document.createElement("div");
  methodRow.className = "chip-row";
  const pfRow = document.createElement("div");
  pfRow.className = "chip-row";
  chipsEl.appendChild(typeRow);
  chipsEl.appendChild(methodRow);
  chipsEl.appendChild(pfRow);
  chipDefs.forEach(([k, l], i) => {
    const b = document.createElement("button");
    b.className = "chip" + (i === 0 ? " on" : "");
    b.textContent = l;
    b.dataset.k = k;
    typeRow.appendChild(b);
  });
  METHODS.forEach(m => {
    const b = document.createElement("button");
    b.className = "chip";
    b.textContent = m.label;
    b.dataset.m = m.key;
    methodRow.appendChild(b);
  });
  DATA.portfolios.forEach(p => {
    const b = document.createElement("button");
    b.className = "chip";
    b.dataset.pf = p.key;
    b.innerHTML = '<span class="dot" style="background:' + p.color + '"></span>' + p.num + " " + p.short;
    pfRow.appendChild(b);
  });

  /* one active chip per legend row, AND-combined across rows: type x method x
     portfolio. Clicking a chip toggles it (click again to clear that row);
     All clears every row. The hero kicker reports the intersection size while
     any filter is on, so an empty result reads as intentional. */
  const active = { k: null, m: null, pf: null };
  const chipRow = c => (c.dataset.pf ? "pf" : c.dataset.m ? "m" : "k");
  const kickerEl = document.querySelector(".hero-head .kicker");
  const kickerBase = kickerEl ? kickerEl.textContent : "";

  function applyFilter() {
    const pf = active.pf;
    let wallShown = false;
    let shown = 0;
    const vis = {}; // item id -> visible under the active filters (for related edges)
    document.querySelectorAll("g[data-id]").forEach(g => {
      const it = byId(g.dataset.id);
      let show = true;
      if (active.k) show = active.k === "ds" ? !!it.dataset : TYPE_GROUPS[active.k].includes(it.type);
      if (show && active.m) show = (it.methods || []).includes(active.m);
      if (show && pf) show = !isWall(it) && it.portfolio.includes(pf);
      if (show && isWall(it)) wallShown = true;
      vis[it.id] = show;
      if (show) shown++;
      g.style.opacity = show ? 1 : (pf ? 0.08 : 0.12);
    });
    // the Miscellaneous connector + label follow their wall-only items
    gMisc.style.opacity = wallShown ? 1 : (pf ? 0.08 : 0.12);
    // a portfolio selection dims everything else on the map, not just item nodes
    document.querySelectorAll("g[data-hub]").forEach(g => { g.style.opacity = (!pf || g.dataset.hub === pf) ? 1 : 0.12; });
    document.querySelectorAll("g[data-projpf]").forEach(g => { g.style.opacity = (!pf || g.dataset.projpf === pf) ? 1 : 0.12; });
    document.querySelectorAll(".edge").forEach(l => { l.style.opacity = (!pf || l.dataset.pf === pf) ? 1 : 0.06; });
    // a red related edge stays fully visible while both endpoints are visible
    relEdges.forEach(re => { re.line.style.opacity = (vis[re.a] && vis[re.b]) ? 1 : (pf ? 0.08 : 0.12); });
    // an item->project edge follows its item AND its project's portfolio
    projEdges.forEach(pe => { pe.line.style.opacity = (vis[pe.id] && (!pf || pe.projpf === pf)) ? 1 : (pf ? 0.08 : 0.12); });
    relProjEdges.forEach(re => { re.line.style.opacity = (vis[re.id] && (!pf || re.projpf === pf)) ? 1 : (pf ? 0.08 : 0.12); });
    if (kickerEl) {
      const any = active.k || active.m || active.pf;
      kickerEl.textContent = any
        ? kickerBase.replace(/\d+ outputs/i, "showing " + shown + " of " + ITEMS.length + " outputs")
        : kickerBase;
    }
  }
  chipsEl.addEventListener("click", e => {
    const b = e.target.closest(".chip");
    if (!b) return;
    if (b.dataset.k === "all") {
      active.k = active.m = active.pf = null;
    } else {
      const row = chipRow(b);
      const val = b.dataset.pf || b.dataset.m || b.dataset.k;
      active[row] = (active[row] === val) ? null : val;
    }
    chipsEl.querySelectorAll(".chip").forEach(c => {
      const val = c.dataset.pf || c.dataset.m || c.dataset.k;
      c.classList.toggle("on", c.dataset.k === "all"
        ? !(active.k || active.m || active.pf)
        : active[chipRow(c)] === val);
    });
    applyFilter();
  });

  /* ---------- ambient drift (skipped for prefers-reduced-motion) ---------- */
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    const drift = {}; // per-item oscillator params, deterministic from the id
    ITEMS.forEach(it => {
      drift[it.id] = {
        amp: nodes[it.id].wall ? 1.5 : 2 + hash(it.id + 11) * 2,
        w1: 0.45 + hash(it.id + 5) * 0.35, w2: 0.4 + hash(it.id + 17) * 0.35,
        p1: hash(it.id + 23) * Math.PI * 2, p2: hash(it.id + 29) * Math.PI * 2,
        dx: 0, dy: 0
      };
    });
    const step = t => {
      if (!frozen()) {
        const s = t / 1000;
        ITEMS.forEach(it => {
          const d = drift[it.id];
          d.dx = d.amp * Math.sin(s * d.w1 + d.p1);
          d.dy = d.amp * Math.cos(s * d.w2 + d.p2);
          nodeEls[it.id].setAttribute("transform", "translate(" + d.dx + " " + d.dy + ")");
        });
        hubEdges.forEach(he => {
          const n = nodes[he.id], d = drift[he.id];
          he.line.setAttribute("x1", n.x + d.dx);
          he.line.setAttribute("y1", n.y + d.dy);
        });
        miscEdges.forEach(me => {
          const n = nodes[me.id], d = drift[me.id];
          me.line.setAttribute("x1", n.x + d.dx);
          me.line.setAttribute("y1", n.y + d.dy);
        });
        projEdges.forEach(pe => {
          const n = nodes[pe.id], d = drift[pe.id];
          pe.line.setAttribute("x1", n.x + d.dx);
          pe.line.setAttribute("y1", n.y + d.dy);
        });
        relProjEdges.forEach(re => {
          const n = nodes[re.id], d = drift[re.id];
          re.line.setAttribute("x1", n.x + d.dx);
          re.line.setAttribute("y1", n.y + d.dy);
        });
        relEdges.forEach(re => {
          const na = nodes[re.a], da = drift[re.a], nb = nodes[re.b], db = drift[re.b];
          re.line.setAttribute("x1", na.x + da.dx);
          re.line.setAttribute("y1", na.y + da.dy);
          re.line.setAttribute("x2", nb.x + db.dx);
          re.line.setAttribute("y2", nb.y + db.dy);
        });
      }
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
})();
