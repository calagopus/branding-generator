import { CB } from "./core.js";

(function () {
  "use strict";

  CB.TYPE = {
    wordmark: { font: "Inter", weight: 700, tracking: -2 },
    tagline: { font: "Inter", weight: 700, tracking: 0 },
    prefix: { font: "Inter", weight: 700, tracking: 0 },
  };

  CB.THEMES = [
    {
      id: "brand", label: "Brand", bgMode: "transparent", background: "#ffffff",
      mascot: { accent: "#b4b4b4", white: "#ffffff" },
      wordmark: "#b4b4b4", tagline: "#74c0fc", prefix: "#b4b4b4",
    },
    {
      id: "dark", label: "On dark", bgMode: "solid", background: "#222222",
      mascot: { accent: "#b4b4b4", white: "#ffffff" },
      wordmark: "#ffffff", tagline: "#74c0fc", prefix: "#b4b4b4",
    },
    {
      id: "light", label: "On light", bgMode: "solid", background: "#ffffff",
      mascot: { accent: "#b4b4b4", white: "#e9e9e9" },
      wordmark: "#2e2e2e", tagline: "#74c0fc", prefix: "#808080",
    },
    {
      id: "mono-white", label: "Mono white", bgMode: "transparent", background: "#222222",
      mascot: { accent: "#ffffff", white: "#ffffff" },
      wordmark: "#ffffff", tagline: "#ffffff", prefix: "#ffffff",
    },
    {
      id: "mono-black", label: "Mono black", bgMode: "transparent", background: "#ffffff",
      mascot: { accent: "#111111", white: "#111111" },
      wordmark: "#111111", tagline: "#111111", prefix: "#111111",
    },
  ];
  var themeIx = {};
  CB.THEMES.forEach(function (t) { themeIx[t.id] = t; });
  CB.themeById = function (id) { return themeIx[id] || CB.THEMES[0]; };

  CB.defaultState = function () {
    return {
      theme: "brand",
      layout: "horizontal",
      align: "center",
      gap: 60,
      padding: 6,
      cornerRadius: 0,

      showMascot: true,
      mascot: "icon",
      mascotHeight: 328,

      prefix: { show: false, text: "Contributing to", size: 40 },
      wordmark: { show: true, text: "Calagopus", size: 128 },
      tagline: { show: true, text: "Modern. Fast. Secure.", size: 40 },

      background: { mode: "transparent" },

      export: {
        format: "png",
        scale: 2,
        width: null,
        height: null,
        lockAspect: true,
        quality: 0.92,
        filename: "calagopus-logo",
        includeBackground: false,
      },
    };
  };

  CB.PRESETS = [
    {
      id: "icon", label: "Icon only",
      patch: {
        layout: "horizontal", align: "center", gap: 60, padding: 16, cornerRadius: 0,
        showMascot: true, mascot: "icon", mascotHeight: 328,
        prefix: { show: false }, wordmark: { show: false }, tagline: { show: false },
      },
    },
    {
      id: "wordmark", label: "Wordmark only",
      patch: {
        layout: "horizontal", align: "center", padding: 20,
        showMascot: false,
        prefix: { show: false }, wordmark: { show: true, size: 128 }, tagline: { show: false },
      },
    },
    {
      id: "full-h", label: "Full logo",
      patch: {
        layout: "horizontal", align: "center", gap: 60, padding: 6, cornerRadius: 0,
        showMascot: true, mascot: "icon", mascotHeight: 328,
        prefix: { show: false }, wordmark: { show: true, size: 128 }, tagline: { show: true, size: 40 },
      },
    },
    {
      id: "simple-h", label: "Simple full logo",
      patch: {
        layout: "horizontal", align: "center", gap: 60, padding: 6,
        showMascot: true, mascot: "icon", mascotHeight: 328,
        prefix: { show: false }, wordmark: { show: true, size: 128 }, tagline: { show: false },
      },
    },
    {
      id: "full-v", label: "Full logo, vertical",
      patch: {
        layout: "vertical", align: "center", gap: 60, padding: 6,
        showMascot: true, mascot: "icon", mascotHeight: 328,
        prefix: { show: false }, wordmark: { show: true, size: 128 }, tagline: { show: true, size: 40 },
      },
    },
    {
      id: "simple-v", label: "Full logo, simple, vertical",
      patch: {
        layout: "vertical", align: "center", gap: 60, padding: 6,
        showMascot: true, mascot: "icon", mascotHeight: 328,
        prefix: { show: false }, wordmark: { show: true, size: 128 }, tagline: { show: false },
      },
    },
  ];

  CB.deepMerge = function (base, patch) {
    var out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    Object.keys(patch || {}).forEach(function (k) {
      var pv = patch[k];
      if (pv && typeof pv === "object" && !Array.isArray(pv) && out[k] && typeof out[k] === "object") {
        out[k] = CB.deepMerge(out[k], pv);
      } else {
        out[k] = pv;
      }
    });
    return out;
  };
})();
