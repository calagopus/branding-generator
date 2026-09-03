import { CB } from "./core.js";

(function () {
  "use strict";

  CB.FONT_FAMILIES = ["Nunito", "Poppins", "Montserrat", "Rubik", "Inter", "Fredoka", "system"];
  var WEIGHTS = [400, 500, 600, 700, 800, 900];

  var linkInjected = {};
  var faceCache = {};
  var pending = {};

  CB.status = { offline: false, note: "" };

  function ensureLink(family) {
    if (family === "system" || linkInjected[family]) return;
    linkInjected[family] = true;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(family) +
      ":wght@" +
      WEIGHTS.join(";") +
      "&display=swap";
    document.head.appendChild(link);
  }
  CB.ensureFontLink = ensureLink;

  function bufToBase64(buf) {
    var bytes = new Uint8Array(buf);
    var chunk = 0x8000;
    var str = "";
    for (var i = 0; i < bytes.length; i += chunk) {
      str += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(str);
  }

  function pickBlocks(cssText) {
    var blocks = cssText.match(/@font-face\s*{[^}]*}/g) || [];
    var perWeight = {};
    blocks.forEach(function (b) {
      var wm = b.match(/font-weight:\s*(\d+)/i);
      var sm = b.match(/font-style:\s*(\w+)/i);
      if (sm && sm[1].toLowerCase() !== "normal") return;
      var w = wm ? wm[1] : "400";
      var latin = /unicode-range:[^;]*U\+0000-00FF/i.test(b);
      if (!perWeight[w] || latin) {
        if (!perWeight[w] || latin || !perWeight[w].latin) {
          perWeight[w] = { block: b, latin: latin };
        }
      }
    });
    return perWeight;
  }

  function extractWoff2Url(block) {
    var m = block.match(/url\((https:\/\/[^)]+\.woff2)\)/i);
    return m ? m[1] : null;
  }

  CB.loadFont = function (family) {
    if (family === "system") return Promise.resolve([]);
    ensureLink(family);
    if (faceCache[family]) return Promise.resolve(faceCache[family]);
    if (pending[family]) return pending[family];

    var url =
      "https://fonts.googleapis.com/css2?family=" +
      encodeURIComponent(family) +
      ":wght@" +
      WEIGHTS.join(";") +
      "&display=swap";

    pending[family] = fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("css " + r.status);
        return r.text();
      })
      .then(function (cssText) {
        var perWeight = pickBlocks(cssText);
        var jobs = Object.keys(perWeight).map(function (w) {
          var woff2 = extractWoff2Url(perWeight[w].block);
          if (!woff2) return null;
          return fetch(woff2)
            .then(function (r) {
              if (!r.ok) throw new Error("woff2 " + r.status);
              return r.arrayBuffer();
            })
            .then(function (buf) {
              var b64 = bufToBase64(buf);
              return {
                weight: +w,
                css:
                  "@font-face{font-family:'" +
                  family +
                  "';font-style:normal;font-weight:" +
                  w +
                  ";font-display:swap;src:url(data:font/woff2;base64," +
                  b64 +
                  ") format('woff2');}",
              };
            })
            .catch(function () {
              return null;
            });
        });
        return Promise.all(jobs);
      })
      .then(function (list) {
        var faces = list.filter(Boolean);
        faceCache[family] = faces;
        return faces;
      })
      .catch(function (err) {
        CB.status.offline = true;
        CB.status.note = "Web fonts unavailable - using system sans. (" + err.message + ")";
        faceCache[family] = [];
        return [];
      });

    return pending[family];
  };

  CB.fontFaceCssFor = function (families, used) {
    var css = "";
    families.forEach(function (fam) {
      if (fam === "system") return;
      var faces = faceCache[fam];
      if (!faces) return;
      var want = used && used[fam];
      faces.forEach(function (f) {
        if (want && want.indexOf(f.weight) === -1) return;
        css += f.css;
      });
    });
    return css;
  };

  CB.weightsInState = function (state) {
    var m = {};
    ["prefix", "wordmark", "tagline"].forEach(function (k) {
      var c = state[k];
      if (!c || !c.show || !c.font || c.font === "system") return;
      (m[c.font] = m[c.font] || []).push(+c.weight);
    });
    return m;
  };

  CB.familiesInState = function (state) {
    var s = {};
    ["prefix", "wordmark", "tagline"].forEach(function (k) {
      var c = state[k];
      if (c && c.show && c.font) s[c.font] = true;
    });
    return Object.keys(s);
  };

  CB.preloadFonts = function (state) {
    return Promise.all(CB.familiesInState(state).map(CB.loadFont));
  };
})();
