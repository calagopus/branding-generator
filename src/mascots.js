import { CB } from "./core.js";

(function () {
  "use strict";

  CB.MASCOTS_BASE = "/mascots/";

  function tokenize(svgText) {
    return svgText
      .replace(/fill="#(?:b4b4b4|b9b9b9)"/gi, 'fill="__ACCENT__"')
      .replace(/fill="(?:#fff(?:fff)?|white)"/gi, 'fill="__WHITE__"');
  }

  function parseSvg(svgText, id) {
    var doc = new DOMParser().parseFromString(svgText, "image/svg+xml");
    var err = doc.querySelector("parsererror");
    if (err) throw new Error("mascot '" + id + "': malformed SVG");
    var svg = doc.documentElement;
    var viewBox = svg.getAttribute("viewBox");
    if (!viewBox) {
      var w = parseFloat(svg.getAttribute("width")) || 512;
      var h = parseFloat(svg.getAttribute("height")) || 512;
      viewBox = "0 0 " + w + " " + h;
    }
    return { viewBox: viewBox.trim(), markup: svg.innerHTML.trim() };
  }

  CB.loadMascots = function (base) {
    base = base || CB.MASCOTS_BASE;
    if (base.charAt(base.length - 1) !== "/") base += "/";

    return fetch(base + "manifest.json", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("manifest.json -> HTTP " + r.status);
        return r.json();
      })
      .then(function (manifest) {
        var list = (manifest && manifest.mascots) || [];
        if (!list.length) throw new Error("manifest.json lists no mascots");
        return Promise.all(
          list.map(function (entry) {
            var file = entry.file || entry.id + ".svg";
            return fetch(base + file, { cache: "no-cache" })
              .then(function (r) {
                if (!r.ok) throw new Error(file + " -> HTTP " + r.status);
                return r.text();
              })
              .then(function (text) {
                var parsed = parseSvg(tokenize(text), entry.id);
                return {
                  id: entry.id,
                  label: entry.label || entry.id,
                  description: entry.description || "",
                  viewBox: parsed.viewBox,
                  markup: parsed.markup,
                };
              });
          })
        );
      })
      .then(function (mascots) {
        CB.setMascots(mascots);
        return mascots;
      });
  };
})();
