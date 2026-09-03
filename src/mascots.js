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

  var SVGNS = "http://www.w3.org/2000/svg";

  function parseViewBox(vb) {
    var p = String(vb).trim().split(/[\s,]+/).map(Number);
    return { x: p[0] || 0, y: p[1] || 0, w: p[2] || 1, h: p[3] || 1 };
  }

  function tightBox(viewBox, markup) {
    var vb = parseViewBox(viewBox);
    if (typeof document === "undefined" || !document.body || !document.createElementNS) {
      return vb;
    }
    var probe = document.createElementNS(SVGNS, "svg");
    probe.setAttribute("viewBox", viewBox);
    probe.setAttribute("width", vb.w);
    probe.setAttribute("height", vb.h);
    probe.setAttribute("style",
      "position:absolute;left:-99999px;top:-99999px;width:" + vb.w + "px;height:" + vb.h + "px;overflow:hidden");
    probe.innerHTML = markup
      .replace(/\sclip-path="[^"]*"/g, "")
      .split("__ACCENT__").join("#000")
      .split("__WHITE__").join("#000");
    document.body.appendChild(probe);
    var box = null;
    try {
      box = probe.getBBox();
    } catch (e) {
      box = null;
    }
    document.body.removeChild(probe);
    if (!box || !(box.width > 0) || !(box.height > 0)) return vb;
    return { x: box.x, y: box.y, w: box.width, h: box.height };
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
                  bbox: tightBox(parsed.viewBox, parsed.markup),
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
