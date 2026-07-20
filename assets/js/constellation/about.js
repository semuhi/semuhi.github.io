// About page: fold the long bio behind a "Show full bio" toggle, and fold each
// Recognition column at 6 rows. Progressive enhancement — without JS everything renders.
(function () {
  "use strict";

  var REC_FOLD = 6; // rows visible per Recognition column while collapsed
  var groups = document.querySelectorAll("#recognition .ta-group");
  for (var g = 0; g < groups.length; g++) {
    (function (group) {
      var items = group.querySelectorAll("li");
      if (items.length <= REC_FOLD) return;

      var moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "act-more mono";
      var folded = true;

      function renderFold() {
        for (var i = REC_FOLD; i < items.length; i++) {
          items[i].style.display = folded ? "none" : "";
        }
        moreBtn.textContent = folded ? "Show " + (items.length - REC_FOLD) + " more" : "Show less";
        moreBtn.setAttribute("aria-expanded", String(!folded));
      }

      moreBtn.addEventListener("click", function () {
        folded = !folded;
        renderFold();
      });

      group.appendChild(moreBtn);
      renderFold();
    })(groups[g]);
  }

  var bio = document.getElementById("bio");
  if (!bio) return;
  var paras = bio.querySelectorAll("p.narrative");
  var FOLD = 2; // paragraphs visible while collapsed
  if (paras.length <= FOLD) return;

  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "act-more mono";
  var collapsed = true;

  function render() {
    for (var i = FOLD; i < paras.length; i++) {
      paras[i].style.display = collapsed ? "none" : "";
    }
    btn.textContent = collapsed ? "Show full bio" : "Show less";
    btn.setAttribute("aria-expanded", String(!collapsed));
  }

  btn.addEventListener("click", function () {
    collapsed = !collapsed;
    render();
  });

  bio.appendChild(btn);
  render();
})();
