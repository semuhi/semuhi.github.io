/* Portfolio stream expanders — each .row's + button toggles the .rowx detail
   panel that follows it (abstract, coauthors, presentations, grants, links,
   connected formats). Markup is fully server-rendered; this only flips the
   hidden attribute, so rows without a panel never get a button. */
(function () {
  "use strict";
  document.querySelectorAll(".xstream .exp").forEach(function (b) {
    b.addEventListener("click", function () {
      var row = b.closest(".row");
      var x = row && row.nextElementSibling;
      if (!x || !x.classList.contains("rowx")) return;
      var open = x.hasAttribute("hidden");
      if (open) { x.removeAttribute("hidden"); } else { x.setAttribute("hidden", ""); }
      b.setAttribute("aria-expanded", open ? "true" : "false");
      b.textContent = open ? "−" : "+";
      b.setAttribute("aria-label", open ? "Hide details" : "Show details");
    });
  });
})();
