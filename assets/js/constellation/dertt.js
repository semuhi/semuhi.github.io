/* DERTT teaser — incidents per year, 2000–2023 (spec v3 Phase 4, teaser-only slice).
   Source: dertt/data/mvpv2_events.db, unique incidents via incident_map, iso3 not null.
   Sums to 76,792, the total reported in the working paper. If the dataset version
   changes, re-run the extraction and update YEARS plus the counts in the include. */
(function () {
  "use strict";
  const el = document.getElementById("dertt-chart");
  const tip = document.getElementById("dertt-tip");
  if (!el) return;

  const Y0 = 2000;
  const YEARS = [3298, 2860, 2729, 2649, 2669, 3077, 3103, 3101, 3308, 3444,
                 3151, 2837, 2723, 2025, 2724, 2822, 3134, 3724, 3013, 3317,
                 4891, 4893, 4316, 2984];
  const MAX = Math.max.apply(null, YEARS);

  el.innerHTML = YEARS.map(function (n, i) {
    return '<div class="ybar" data-y="' + (Y0 + i) + '" data-n="' + n.toLocaleString("en-US") +
      '"><div class="bfill" style="height:' + Math.round(n / MAX * 100) + '%"></div></div>';
  }).join("");

  function show(b) {
    if (!tip) return;
    tip.textContent = b.dataset.y + " · " + b.dataset.n + " incidents";
    el.querySelectorAll(".ybar").forEach(x => x.classList.toggle("on", x === b));
  }
  el.addEventListener("mouseover", function (e) {
    const b = e.target.closest(".ybar");
    if (b) show(b);
  });
  // default: land on the peak year rather than an empty caption
  show(el.querySelectorAll(".ybar")[YEARS.indexOf(MAX)]);
})();
