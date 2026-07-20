/* Playable finding — soft-propaganda experiment (spec v3, Phase 4: REAL estimates).
   Source: fiction/output/tables/effect_sizes.csv (replication, 3-effect-sizes.R).
   Values = Cohen's d on the security index (IRT composite of support for military
   bases, drone strikes, and intelligence operations abroad) vs the neutral-drama
   control; significance = Holm-adjusted p < .05 within outcome. Domestic tolerance
   outcomes are null across the board and are stated as such in the include copy. */
(function () {
  "use strict";
  const bars = document.getElementById("bars");
  const scripts = document.getElementById("scripts");
  if (!bars || !scripts) return;

  // Per audience: [Cohen's d, significant at Holm-adjusted 5%].
  const AUD = ["All voters", "Pro-government voters", "Religious pro-government", "Nationalist pro-government"];
  const FIND = {
    sultanist:  [[0.09, false], [0.25, true], [0.24, true], [0.26, false]],
    militarist: [[0.07, false], [0.18, true], [0.16, false], [0.38, true]]
  };
  const MAX = 0.45; // bar scale: d = 0.45 fills the track

  function drawBars(s) {
    bars.innerHTML = FIND[s].map(function (e, i) {
      const d = e[0], sig = e[1];
      return '<div class="row"><div class="lab"><span>' + AUD[i] + '</span><span class="val">d = ' +
        d.toFixed(2) + (sig ? "" : " · ns") + "</span></div>" +
        '<div class="track"><div class="fill' + (sig ? "" : " ns") + '" style="width:' +
        Math.round(d / MAX * 100) + '%"></div></div></div>';
    }).join("");
  }
  drawBars("sultanist");
  scripts.addEventListener("click", e => {
    const b = e.target.closest(".sbtn");
    if (!b) return;
    scripts.querySelectorAll(".sbtn").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    drawBars(b.dataset.s);
  });
})();
