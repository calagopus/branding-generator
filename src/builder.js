import { CB } from "./core.js";

(function () {
  "use strict";

  CB.PALETTE = {
    foxWhite: "#ffffff",
    foxAccent: "#b4b4b4",
    textPrimary: "#74c0fc",
    background: "#222222",
    backgroundAccent: "#2e2e2e",
  };

  CB.MASCOTS = [];
  var byId = {};
  CB.setMascots = function (list) {
    CB.MASCOTS = list || [];
    byId = {};
    CB.MASCOTS.forEach(function (m) {
      byId[m.id] = m;
    });
    return CB.MASCOTS;
  };
  CB.mascotById = function (id) {
    return byId[id] || null;
  };

  CB.FALLBACK_STACK =
    "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  function xmlEscape(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
  CB.xmlEscape = xmlEscape;

  function round(n) {
    return Math.round(n * 100) / 100;
  }

  var nsCounter = 0;
  function namespaceIds(markup) {
    var p = "cb" + (++nsCounter) + "_";
    return markup
      .replace(/\bid="([^"]+)"/g, function (_, id) {
        return 'id="' + p + id + '"';
      })
      .replace(/url\(#([^)]+)\)/g, function (_, id) {
        return "url(#" + p + id + ")";
      })
      .replace(/(\bxlink:href|\bhref)="#([^"]+)"/g, function (_, attr, id) {
        return attr + '="#' + p + id + '"';
      });
  }

  function parseViewBox(vb) {
    var p = String(vb).trim().split(/[\s,]+/).map(Number);
    return { x: p[0] || 0, y: p[1] || 0, w: p[2] || 1, h: p[3] || 1 };
  }

  function mascotInner(id, accent, white) {
    var m = byId[id];
    if (!m) return null;
    var markup = namespaceIds(m.markup)
      .split("__ACCENT__").join(accent)
      .split("__WHITE__").join(white);
    return { markup: markup, vb: parseViewBox(m.viewBox) };
  }
  CB.mascotInner = mascotInner;

  function fontStack(family) {
    if (!family || family === "system") return CB.FALLBACK_STACK;
    return "'" + family + "', " + CB.FALLBACK_STACK;
  }
  CB.fontStack = fontStack;

  function collectLines(state) {
    var out = [];
    function push(kind, cfg) {
      if (!cfg || !cfg.show) return;
      var text = (cfg.text == null ? "" : String(cfg.text));
      if (!text.trim()) return;
      out.push({
        kind: kind,
        text: text,
        family: cfg.font || "system",
        weight: cfg.weight || 700,
        size: +cfg.size || 16,
        tracking: +cfg.tracking || 0,
        color: cfg.color || "#000000",
      });
    }
    push("prefix", state.prefix);
    push("wordmark", state.wordmark);
    push("tagline", state.tagline);
    return out;
  }
  CB.collectLines = collectLines;

  function layoutLines(lines, measure) {
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var css = ln.weight + " " + ln.size + "px " + fontStack(ln.family);
      var base = measure ? measure(ln.text, css) : ln.text.length * ln.size * 0.55;
      ln.width = base + ln.tracking * Math.max(0, ln.text.length - 1);
      ln.ascent = ln.size * 0.8;
      ln.descent = ln.size * 0.22;
    }
    var y = 0;
    for (var j = 0; j < lines.length; j++) {
      var l = lines[j];
      y += l.ascent;
      l.baseline = y;
      y += l.descent;
      if (j < lines.length - 1) {
        var next = lines[j + 1];
        var gap;
        if (l.kind === "prefix") gap = next.size * 0.16;
        else if (next.kind === "tagline") gap = next.size * 0.45;
        else gap = next.size * 0.3;
        y += gap;
      }
    }
    return { blockWidth: lines.reduce(function (m, l) { return Math.max(m, l.width); }, 0), blockHeight: y };
  }

  CB.compose = function (state, opts) {
    opts = opts || {};
    var pad = Math.max(0, +state.padding || 0);
    var gap = Math.max(0, +state.gap || 0);

    var mascot = null;
    if (state.showMascot && state.mascot && state.mascot !== "none") {
      var mi = mascotInner(state.mascot, state.colors.accent, state.colors.white);
      if (mi) {
        var h = Math.max(1, +state.mascotHeight || 1);
        var w = (mi.vb.w / mi.vb.h) * h;
        mascot = { inner: mi, w: w, h: h };
      }
    }

    var lines = collectLines(state);
    var block = layoutLines(lines, opts.measure);
    var hasText = lines.length > 0;
    var horizontal = state.layout !== "vertical";
    var betweenGap = mascot && hasText ? gap : 0;

    var innerW, innerH, mascotX, mascotY, textX, textYOff, textAnchor;
    var align = state.align || "center";

    if (horizontal) {
      innerW = (mascot ? mascot.w : 0) + betweenGap + (hasText ? block.blockWidth : 0);
      innerH = Math.max(mascot ? mascot.h : 0, hasText ? block.blockHeight : 0);
      mascotX = pad;
      mascotY = pad + crossOffset(align, innerH, mascot ? mascot.h : 0);
      textAnchor = "start";
      textX = pad + (mascot ? mascot.w + betweenGap : 0);
      textYOff = pad + crossOffset(align, innerH, block.blockHeight);
    } else {
      innerW = Math.max(mascot ? mascot.w : 0, hasText ? block.blockWidth : 0);
      innerH = (mascot ? mascot.h : 0) + betweenGap + (hasText ? block.blockHeight : 0);
      mascotX = pad + (innerW - (mascot ? mascot.w : 0)) / 2;
      mascotY = pad;
      if (align === "start") {
        textAnchor = "start";
        textX = pad;
      } else if (align === "end") {
        textAnchor = "end";
        textX = pad + innerW;
      } else {
        textAnchor = "middle";
        textX = pad + innerW / 2;
      }
      textYOff = pad + (mascot ? mascot.h + betweenGap : 0);
    }

    var totalW = Math.max(1, innerW + pad * 2);
    var totalH = Math.max(1, innerH + pad * 2);

    var parts = [];

    // Background
    var radius = Math.max(0, +state.cornerRadius || 0);
    if (state.background && state.background.mode === "solid") {
      parts.push(
        '<rect x="0" y="0" width="' + round(totalW) + '" height="' + round(totalH) +
          '"' + (radius ? ' rx="' + radius + '" ry="' + radius + '"' : "") +
          ' fill="' + state.background.color + '"/>'
      );
    }

    // Mascot
    if (mascot) {
      var s = mascot.h / mascot.inner.vb.h;
      var tx = round(mascotX - mascot.inner.vb.x * s);
      var ty = round(mascotY - mascot.inner.vb.y * s);
      parts.push(
        '<g transform="translate(' + tx + ' ' + ty + ') scale(' + round(s) + ')">' +
          mascot.inner.markup +
          "</g>"
      );
    }

    // Text
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      var y = round(textYOff + ln.baseline);
      parts.push(
        '<text x="' + round(textX) + '" y="' + y + '"' +
          ' font-family="' + xmlEscape(fontStack(ln.family)) + '"' +
          ' font-weight="' + ln.weight + '"' +
          ' font-size="' + ln.size + '"' +
          (ln.tracking ? ' letter-spacing="' + ln.tracking + '"' : "") +
          ' fill="' + ln.color + '"' +
          ' text-anchor="' + textAnchor + '"' +
          ' style="white-space:pre">' +
          xmlEscape(ln.text) +
          "</text>"
      );
    }

    var rootW = opts.pixelWidth != null ? opts.pixelWidth : round(totalW);
    var rootH = opts.pixelHeight != null ? opts.pixelHeight : round(totalH);

    var defs = "";
    if (opts.fontFaceCss) {
      defs = "<defs><style>" + opts.fontFaceCss + "</style></defs>";
    }

    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"' +
      ' width="' + rootW + '" height="' + rootH + '"' +
      ' viewBox="0 0 ' + round(totalW) + " " + round(totalH) + '" fill="none">' +
      defs +
      parts.join("") +
      "</svg>";

    return { svg: svg, width: round(totalW), height: round(totalH) };
  };

  function crossOffset(align, outer, inner) {
    if (align === "start") return 0;
    if (align === "end") return outer - inner;
    return (outer - inner) / 2;
  }

  CB.mascotThumb = function (id, px, accent, white) {
    var mi = mascotInner(id, accent || "#c9c9c9", white || "#ffffff");
    if (!mi) return "";
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + px + '" height="' + px +
      '" viewBox="' + mi.vb.x + " " + mi.vb.y + " " + mi.vb.w + " " + mi.vb.h +
      '" fill="none">' + mi.markup + "</svg>"
    );
  };
})();
