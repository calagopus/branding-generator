import { CB } from "./core.js";
import "./builder.js";
import "./mascots.js";
import "./presets.js";
import "./fonts.js";
import "./styles/app.css";

window.CB = CB;

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };
  var STORE_KEY = "calagopus-brander";

  /* ---------- text measurement ---------- */
  var measureCanvas = document.createElement("canvas");
  var measureCtx = measureCanvas.getContext("2d");
  function measure(text, cssFont) {
    measureCtx.font = cssFont;
    return measureCtx.measureText(text).width;
  }

  function textCfg(prefix, kind) {
    var t = CB.TYPE[kind];
    return {
      show: $(prefix + "_show").checked,
      text: $(prefix + "_text").value,
      size: +$(prefix + "_size").value,
      font: t.font,
      weight: t.weight,
      tracking: t.tracking,
    };
  }

  function readState() {
    var theme = CB.themeById($("theme").value);
    var s = {
      theme: theme.id,
      layout: $("layout").value,
      align: $("align").value,
      gap: +$("gap").value,
      padding: +$("padding").value,
      cornerRadius: +$("cornerRadius").value,

      showMascot: $("showMascot").checked,
      mascot: $("mascot").value,
      mascotHeight: +$("mascotHeight").value,
      colors: { accent: theme.mascot.accent, white: theme.mascot.white },

      prefix: textCfg("pf", "prefix"),
      wordmark: textCfg("wm", "wordmark"),
      tagline: textCfg("tl", "tagline"),

      background: { mode: "transparent", color: theme.background },

      export: {
        format: $("ex_format").value,
        scale: parseFloat($("ex_scale").value) || 1,
        width: parseInt($("ex_width").value, 10) || null,
        height: parseInt($("ex_height").value, 10) || null,
        lockAspect: $("ex_lock").checked,
        quality: +$("ex_quality").value,
        filename: $("ex_filename").value || "calagopus-logo",
        includeBackground: $("ex_includeBg").checked,
      },
    };
    s.prefix.color = theme.prefix;
    s.wordmark.color = theme.wordmark;
    s.tagline.color = theme.tagline;
    return s;
  }

  var PERSIST_KEYS = [
    "theme", "layout", "align",
    "showMascot", "mascot", "prefix", "wordmark", "tagline",
    "background", "export",
  ];

  function persistableState(s) {
    return {
      theme: s.theme,
      layout: s.layout,
      align: s.align,
      showMascot: s.showMascot,
      mascot: s.mascot,
      prefix: { show: s.prefix.show, text: s.prefix.text },
      wordmark: { show: s.wordmark.show, text: s.wordmark.text },
      tagline: { show: s.tagline.show, text: s.tagline.text },
      background: { mode: s.background.mode },
      export: {
        format: s.export.format,
        scale: s.export.scale,
        width: s.export.width,
        height: s.export.height,
        lockAspect: s.export.lockAspect,
        quality: s.export.quality,
        filename: s.export.filename,
        includeBackground: s.export.includeBackground,
      },
    };
  }

  function fitsCurrentForm(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return false;
    var isObj = function (v) { return v && typeof v === "object" && !Array.isArray(v); };
    if (!isObj(o.prefix) || !isObj(o.wordmark) || !isObj(o.tagline)) return false;
    if (!isObj(o.background) || !isObj(o.export)) return false;
    return Object.keys(o).every(function (k) { return PERSIST_KEYS.indexOf(k) !== -1; });
  }

  function writeTextCfg(prefix, c) {
    $(prefix + "_show").checked = !!c.show;
    $(prefix + "_text").value = c.text;
    $(prefix + "_size").value = c.size;
  }

  function writeState(s) {
    $("theme").value = s.theme || "brand";
    $("layout").value = s.layout;
    $("align").value = s.align;
    $("gap").value = s.gap;
    $("padding").value = s.padding;
    $("cornerRadius").value = s.cornerRadius;

    $("showMascot").checked = !!s.showMascot;
    $("mascot").value = s.mascot;
    $("mascotHeight").value = s.mascotHeight;

    writeTextCfg("pf", s.prefix);
    writeTextCfg("wm", s.wordmark);
    writeTextCfg("tl", s.tagline);

    $("ex_format").value = s.export.format;
    $("ex_scale").value = s.export.scale || 1;
    $("ex_width").value = s.export.width || "";
    $("ex_height").value = s.export.height || "";
    $("ex_lock").checked = !!s.export.lockAspect;
    $("ex_quality").value = s.export.quality;
    $("ex_filename").value = s.export.filename;
    $("ex_includeBg").checked = !!s.export.includeBackground;

    syncOutputs();
    syncEnabled();
    syncActivePoses();
  }

  function syncOutputs() {
    document.querySelectorAll("output[data-for]").forEach(function (o) {
      var el = $(o.getAttribute("data-for"));
      if (!el) return;
      o.textContent = el.id === "zoom" ? Math.round(+el.value * 100) + "%" : el.value;
    });
  }

  function syncEnabled() {
    ["pf", "wm", "tl"].forEach(function (p) {
      $(p + "_text").disabled = !$(p + "_show").checked;
    });
    var isSvg = $("ex_format").value === "svg";
    $("ex_scale").disabled = isSvg;
    $("ex_width").disabled = isSvg;
    $("ex_height").disabled = isSvg;
    $("ex_lock").disabled = isSvg;
    $("ex_quality").disabled = isSvg;
    $("ex_includeBg").disabled = isSvg;
  }

  function syncActivePoses() {
    var cur = $("mascot").value;
    document.querySelectorAll("#mascotPoses button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.pose === cur);
    });
  }

  var naturalRatio = 1;
  var lastNaturalW = 0;
  var lastNaturalH = 0;
  var previewZoom = 1;

  function zoomBounds() {
    var z = $("zoom");
    return { min: +z.min || 0.1, max: +z.max || 3 };
  }

  function clampZoom(z) {
    var b = zoomBounds();
    return Math.min(b.max, Math.max(b.min, z));
  }

  function applyPreviewSizing(res) {
    var svg = $("preview").querySelector("svg");
    if (!svg) return;
    var fit = $("fit").checked;
    var host = $("stage");
    var scale;
    if (fit) {
      var pad = 32;
      scale = Math.min(
        (host.clientWidth - pad) / res.width,
        (host.clientHeight - pad) / res.height,
        1
      );
      if (!isFinite(scale) || scale <= 0) scale = 1;
      previewZoom = scale;
      $("zoom").value = clampZoom(scale);
    } else {
      scale = previewZoom;
    }
    syncOutputs();
    svg.style.width = res.width * scale + "px";
    svg.style.height = res.height * scale + "px";
  }

  function setZoom(z) {
    previewZoom = clampZoom(z);
    $("fit").checked = false;
    $("zoom").value = previewZoom;
    syncOutputs();
    var svg = $("preview").querySelector("svg");
    if (svg && lastNaturalW && lastNaturalH) {
      svg.style.width = lastNaturalW * previewZoom + "px";
      svg.style.height = lastNaturalH * previewZoom + "px";
    }
  }

  function refreshExportSize(state, naturalChanged) {
    var w = state.export.width;
    var h = state.export.height;
    var scale = state.export.scale || 1;
    if (!w || !h) {
      w = Math.round(lastNaturalW * scale);
      h = Math.round(lastNaturalH * scale);
    } else if (naturalChanged && state.export.lockAspect) {
      h = Math.round(w / naturalRatio);
    }
    $("ex_width").value = w;
    $("ex_height").value = h;
    $("exdims").textContent = w + " x " + h + " px  -  " + state.export.format.toUpperCase();
  }

  function render(opts) {
    opts = opts || {};
    var state = readState();
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(persistableState(state)));
    } catch (e) {}

    CB.familiesInState(state).forEach(CB.ensureFontLink);

    var res = CB.compose(state, { measure: measure });
    $("preview").innerHTML = res.svg;

    var newRatio = res.width / res.height;
    var naturalChanged =
      Math.abs(res.width - lastNaturalW) > 0.5 || Math.abs(res.height - lastNaturalH) > 0.5;
    lastNaturalW = res.width;
    lastNaturalH = res.height;
    naturalRatio = newRatio;

    $("dims").textContent = res.width + " x " + res.height + " (natural)";
    $("preview").classList.toggle("checker", $("checker").checked);
    $("preview").classList.toggle("bg-dark", $("preview_bg").value === "dark");
    applyPreviewSizing(res);
    refreshExportSize(state, naturalChanged && !opts.keepExportSize);

    $("notice").textContent = CB.status.offline ? CB.status.note : "";
    $("notice").hidden = !CB.status.offline;
  }

  function ensurePreviewFonts() {
    var state = readState();
    var jobs = [];
    ["prefix", "wordmark", "tagline"].forEach(function (k) {
      var c = state[k];
      if (!c.show || c.font === "system") return;
      var css = c.weight + ' ' + c.size + 'px "' + c.font + '"';
      if (document.fonts && document.fonts.load) {
        jobs.push(document.fonts.load(css, c.text || "Ag").catch(function () {}));
      }
    });
    if (jobs.length) Promise.all(jobs).then(function () { render({ keepExportSize: true }); });
  }

  function buildSvg(state, pxW, pxH) {
    var css = CB.fontFaceCssFor(CB.familiesInState(state), CB.weightsInState(state));
    return CB.compose(state, {
      measure: measure,
      fontFaceCss: css || null,
      pixelWidth: pxW == null ? null : pxW,
      pixelHeight: pxH == null ? null : pxH,
    }).svg;
  }

  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  function rasterize(state, mime, quality) {
    var scale = state.export.scale || 1;
    var w = Math.max(1, parseInt($("ex_width").value, 10) || Math.round(lastNaturalW * scale));
    var h = Math.max(1, parseInt($("ex_height").value, 10) || Math.round(lastNaturalH * scale));
    var svg = buildSvg(state, w, h);
    var blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        var ctx = canvas.getContext("2d");
        var solid = state.background.mode === "solid";
        if (solid) {
          // rect is already in the SVG; nothing to do
        } else if (state.export.includeBackground) {
          ctx.fillStyle = state.background.color || "#ffffff";
          ctx.fillRect(0, 0, w, h);
        } else if (mime === "image/jpeg") {
          // JPEG has no alpha; fill so transparent areas aren't black
          ctx.fillStyle = state.background.color || "#ffffff";
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(
          function (b) {
            if (b) resolve(b);
            else reject(new Error("toBlob failed"));
          },
          mime,
          quality
        );
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("SVG could not be rasterized"));
      };
      img.src = url;
    });
  }

  function doDownload() {
    var state = readState();
    var name = state.export.filename || "calagopus-logo";
    setBusy(true);
    CB.preloadFonts(state)
      .then(function () {
        if (state.export.format === "svg") {
          var svg = buildSvg(state, null, null);
          saveBlob(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }), name + ".svg");
          return;
        }
        var mime =
          state.export.format === "webp"
            ? "image/webp"
            : state.export.format === "jpg"
            ? "image/jpeg"
            : "image/png";
        var q =
          state.export.format === "webp" || state.export.format === "jpg"
            ? state.export.quality
            : undefined;
        return rasterize(state, mime, q).then(function (blob) {
          saveBlob(blob, name + "." + state.export.format);
        });
      })
      .catch(function (err) {
        alert("Export failed: " + err.message);
      })
      .then(function () {
        setBusy(false);
        render({ keepExportSize: true });
      });
  }

  function copySvg() {
    var state = readState();
    setBusy(true);
    CB.preloadFonts(state)
      .then(function () {
        var svg = buildSvg(state, null, null);
        return navigator.clipboard.writeText(svg);
      })
      .then(function () { flash("btn_copy_svg", "Copied!"); })
      .catch(function (err) { alert("Copy failed: " + err.message); })
      .then(function () { setBusy(false); });
  }

  function copyPng() {
    var state = readState();
    if (!window.ClipboardItem || !navigator.clipboard || !navigator.clipboard.write) {
      alert("Clipboard image copy is not supported in this browser. Use Download instead.");
      return;
    }
    setBusy(true);
    CB.preloadFonts(state)
      .then(function () { return rasterize(state, "image/png", undefined); })
      .then(function (blob) {
        return navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
      })
      .then(function () { flash("btn_copy_png", "Copied!"); })
      .catch(function (err) { alert("Copy failed: " + err.message); })
      .then(function () { setBusy(false); });
  }

  function setBusy(b) {
    document.body.classList.toggle("busy", !!b);
  }
  function flash(id, msg) {
    var el = $(id);
    var old = el.textContent;
    el.textContent = msg;
    setTimeout(function () { el.textContent = old; }, 1200);
  }

  function buildPatchButtons(containerId, list, activeAttr) {
    var host = $(containerId);
    list.forEach(function (item) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = item.label;
      b.dataset.patch = item.id;
      b.addEventListener("click", function () {
        var next = CB.deepMerge(readState(), item.patch);
        writeState(next);
        $("ex_width").value = "";
        $("ex_height").value = "";
        render();
        ensurePreviewFonts();
      });
      host.appendChild(b);
    });
  }

  function buildPoseButtons() {
    var host = $("mascotPoses");
    CB.MASCOTS.forEach(function (m) {
      var b = document.createElement("button");
      b.type = "button";
      b.dataset.pose = m.id;
      b.title = m.label;
      b.innerHTML =
        '<span class="thumb">' +
        CB.mascotThumb(m.id, 40, "#cfcfcf", "#ffffff") +
        "</span><span>" + m.label + "</span>";
      b.addEventListener("click", function () {
        $("mascot").value = m.id;
        syncActivePoses();
        render();
      });
      host.appendChild(b);
    });
  }

  function wireEvents() {
    document.querySelectorAll("#controls input, #controls select").forEach(function (el) {
      var ev = el.type === "text" || el.type === "number" || el.type === "range" ? "input" : "change";
      el.addEventListener(ev, function () {
        syncOutputs();
        syncEnabled();
        render();
      });
    });

    $("ex_width").addEventListener("input", function () {
      if ($("ex_lock").checked) {
        var w = parseInt($("ex_width").value, 10);
        if (w > 0) $("ex_height").value = Math.round(w / naturalRatio);
      }
      updateExDims();
    });
    $("ex_height").addEventListener("input", function () {
      if ($("ex_lock").checked) {
        var h = parseInt($("ex_height").value, 10);
        if (h > 0) $("ex_width").value = Math.round(h * naturalRatio);
      }
      updateExDims();
    });
    $("ex_format").addEventListener("change", updateExDims);
    $("ex_scale").addEventListener("change", function () {
      $("ex_width").value = "";
      $("ex_height").value = "";
      render();
    });
    function updateExDims() {
      $("exdims").textContent =
        ($("ex_width").value || "?") + " x " + ($("ex_height").value || "?") +
        " px  -  " + $("ex_format").value.toUpperCase();
    }

    $("btn_reset_size").addEventListener("click", function () {
      var scale = parseFloat($("ex_scale").value) || 1;
      $("ex_width").value = Math.round(lastNaturalW * scale);
      $("ex_height").value = Math.round(lastNaturalH * scale);
      updateExDims();
    });
    $("btn_download").addEventListener("click", doDownload);
    $("btn_copy_svg").addEventListener("click", copySvg);
    $("btn_copy_png").addEventListener("click", copyPng);
    $("btn_reset").addEventListener("click", function () {
      if (!confirm("Reset all settings to defaults?")) return;
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      writeState(CB.defaultState());
      $("ex_width").value = "";
      $("ex_height").value = "";
      render();
      ensurePreviewFonts();
    });

    $("fit").addEventListener("change", function () { render({ keepExportSize: true }); });
    $("checker").addEventListener("change", function () { render({ keepExportSize: true }); });
    $("preview_bg").addEventListener("change", function () { render({ keepExportSize: true }); });
    $("zoom").addEventListener("input", function () { setZoom(+$("zoom").value); });

    $("stage").addEventListener(
      "wheel",
      function (e) {
        if (e.shiftKey) return;
        e.preventDefault();
        var base = $("fit").checked ? previewZoom : +$("zoom").value || previewZoom;
        var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
        setZoom(base * Math.exp(-dy * 0.0015));
      },
      { passive: false }
    );

    window.addEventListener("resize", function () { render({ keepExportSize: true }); });
  }

  function restoreState() {
    ["calagopus-brander:v2", "calagopus-brander:v3"].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) {}
    });

    var start = CB.defaultState();
    var saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch (e) {}
    if (fitsCurrentForm(saved)) {
      start = CB.deepMerge(start, saved);
    } else if (saved !== null) {
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
    }
    if (!CB.mascotById(start.mascot) && CB.MASCOTS[0]) start.mascot = CB.MASCOTS[0].id;
    writeState(start);
  }

  function showLoadError(msg) {
    var n = $("notice");
    n.hidden = false;
    n.textContent = msg;
  }

  function init() {
    buildPatchButtons("presets", CB.PRESETS);
    wireEvents();

    $("notice").hidden = false;
    $("notice").textContent = "Loading mascots…";

    CB.loadMascots()
      .then(function (mascots) {
        if (!mascots.length) throw new Error("no mascots in manifest");
        buildPoseButtons();
        restoreState();
        $("notice").hidden = true;
        $("notice").textContent = "";
        render();
        ensurePreviewFonts();
        CB.preloadFonts(readState());
      })
      .catch(function (err) {
        showLoadError(
          "Could not load mascots from " + CB.MASCOTS_BASE +
            " — serve the app over http (run: npm start), not file://. (" +
            err.message + ")"
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
