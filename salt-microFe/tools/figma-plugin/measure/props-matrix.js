/* props 조합마다 Storybook을 실제로 렌더시켜 측정한다.
   Storybook의 args URL 파라미터로 prop을 주입하므로 "코드가 그 prop으로
   실제로 그린 결과"를 재는 것이고, 해석이 개입하지 않는다.
   window.__PM_SLICE = [start, end] 로 구간을 나눠 실행한다. */
(async () => {
  const MATRIX = [
    { comp: "Button", story: "components-button--primary", props: {
        variant: ["primary", "secondary", "ghost", "outline", "warning", "danger", "success"],
        size: ["xs", "sm", "md", "lg"],
        disabled: ["false", "true"] } },
    { comp: "Card", story: "components-card--no-padding", props: {
        padding: ["none", "sm", "md", "lg", "xl"] } },
    { comp: "Heading", story: "typography-heading--level-1", props: {
        level: ["1", "2", "3", "4", "5", "6"],
        color: ["primary", "secondary", "tertiary", "brand", "white"] } },
    { comp: "Text", story: "typography-text--body", props: {
        variant: ["body", "bodyLarge", "caption"],
        color: ["primary", "secondary", "tertiary", "muted", "brand", "white", "success", "up", "down"] } },
    { comp: "Table", story: "components-table--default", props: {
        size: ["sm", "md", "lg"],
        striped: ["false", "true"],
        hoverable: ["false", "true"] } },
    { comp: "Image", story: "components-image--default", props: {
        radius: ["0", "12"],
        objectFit: ["cover", "contain", "fill"] } },
    { comp: "Grid", story: "layout-grid--default", props: {
        columns: ["1", "2", "3", "4", "6", "12"],
        gap: ["sm", "md", "xl"] } },
    { comp: "FlexBox", story: "layout-flexbox--row", props: {
        direction: ["row", "column", "rowReverse", "columnReverse"],
        justify: ["start", "center", "end", "between", "around", "evenly"] } },
    { comp: "Container", story: "layout-container--small", props: {
        size: ["sm", "md", "lg", "xl", "2xl", "full"],
        centered: ["false", "true"] } },
    { comp: "Section", story: "layout-section--small-padding", props: {
        background: ["transparent", "white", "gray", "brand", "dark", "gradient"],
        padding: ["sm", "md", "lg"] } },
    { comp: "Root", story: "layout-root--default", props: {
        background: ["transparent", "white", "gray", "brand", "dark", "gradient"],
        width: ["sm", "md", "lg"] } },
    { comp: "ScrollContainer", story: "layout-scrollcontainer--vertical-scroll", props: {
        direction: ["vertical", "horizontal", "both", "none"],
        scrollbar: ["default", "thin", "hidden"] } },
  ];

  // 조합 전개
  const combos = [];
  for (const m of MATRIX) {
    const keys = Object.keys(m.props);
    const build = (i, acc) => {
      if (i === keys.length) { combos.push({ comp: m.comp, story: m.story, args: Object.assign({}, acc) }); return; }
      for (const v of m.props[keys[i]]) { acc[keys[i]] = v; build(i + 1, acc); }
    };
    build(0, {});
  }

  const [START, END] = window.__PM_SLICE || [0, 9999];
  const slice = combos.slice(START, END);
  if (!slice.length) return "구간 비어 있음 (전체 " + combos.length + ")";

  const R = (n) => Math.round(n * 10) / 10;
  const rgba = (v) => {
    if (!v || v === "none") return null;
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return v;
    const p = m[1].split(",").map((x) => parseFloat(x));
    if (p.length === 4 && p[3] === 0) return null;
    const hex = "#" + p.slice(0, 3).map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
    return p.length === 4 && p[3] < 1 ? { hex, a: R(p[3]) } : { hex };
  };
  const SKIP = new Set(["SCRIPT", "STYLE", "LINK", "META", "TITLE", "NOSCRIPT"]);

  const measure = (doc, win) => {
    const root = doc.querySelector("#storybook-root") || doc.querySelector("#root") || doc.body;
    const base = root.getBoundingClientRect();
    const out = [];
    const walk = (el, depth) => {
      if (SKIP.has(el.tagName)) return;
      const s = win.getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden") return;
      const r = el.getBoundingClientRect();
      if (r.width < 0.5 && r.height < 0.5) return;
      if (el.tagName === "svg") {
        const clone = el.cloneNode(true);
        const srcAll = [el].concat(Array.prototype.slice.call(el.querySelectorAll("*")));
        const dstAll = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll("*")));
        for (let i = 0; i < srcAll.length && i < dstAll.length; i++) {
          const cs = win.getComputedStyle(srcAll[i]);
          const d = dstAll[i];
          if (!d.setAttribute) continue;
          for (const prop of ["fill", "stroke", "stroke-width", "opacity", "stroke-linecap", "stroke-linejoin"]) {
            const v = cs.getPropertyValue(prop);
            if (v && v.indexOf("var(") === -1) d.setAttribute(prop, v);
          }
          d.removeAttribute("class");
        }
        out.push({ t: "svg", d: depth, x: R(r.left - base.left), y: R(r.top - base.top),
          w: R(r.width), h: R(r.height), svg: clone.outerHTML });
        return;
      }
      let own = "", tRect = null;
      for (const n of el.childNodes) {
        if (n.nodeType !== 3) continue;
        own += n.nodeValue;
        if (!n.nodeValue.trim()) continue;
        try {
          const rg = doc.createRange();
          rg.selectNodeContents(n);
          const rr = rg.getBoundingClientRect();
          if (rr.width > 0 || rr.height > 0) {
            tRect = tRect
              ? { l: Math.min(tRect.l, rr.left), t: Math.min(tRect.t, rr.top),
                  r: Math.max(tRect.r, rr.right), b: Math.max(tRect.b, rr.bottom) }
              : { l: rr.left, t: rr.top, r: rr.right, b: rr.bottom };
          }
        } catch (e) {}
      }
      own = own.replace(/\s+/g, " ").trim();
      const node = { t: el.tagName.toLowerCase(), d: depth,
        x: R(r.left - base.left), y: R(r.top - base.top), w: R(r.width), h: R(r.height) };
      const bg = rgba(s.backgroundColor);
      if (bg) node.bg = bg;
      if (s.backgroundImage && s.backgroundImage !== "none") node.bgImage = s.backgroundImage;
      const radii = [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius].map((v) => parseFloat(v) || 0);
      if (radii.some((v) => v > 0)) node.r = radii;
      const bw = [s.borderTopWidth, s.borderRightWidth, s.borderBottomWidth, s.borderLeftWidth].map((v) => parseFloat(v) || 0);
      if (bw.some((v) => v > 0)) {
        node.bw = bw;
        node.bc = [rgba(s.borderTopColor), rgba(s.borderRightColor), rgba(s.borderBottomColor), rgba(s.borderLeftColor)];
      }
      if (s.boxShadow && s.boxShadow !== "none") node.shadow = s.boxShadow;
      if (parseFloat(s.opacity) < 1) node.o = R(parseFloat(s.opacity));
      if (s.overflow !== "visible") node.clip = true;
      if (own) {
        node.text = own;
        node.fs = R(parseFloat(s.fontSize));
        node.fw = s.fontWeight;
        node.fg = rgba(s.color);
        node.lh = s.lineHeight === "normal" ? null : R(parseFloat(s.lineHeight));
        node.ls = s.letterSpacing === "normal" ? 0 : R(parseFloat(s.letterSpacing));
        node.ta = s.textAlign;
        if (tRect) {
          node.tx = R(tRect.l - base.left); node.ty = R(tRect.t - base.top);
          node.tw = R(tRect.r - tRect.l); node.th = R(tRect.b - tRect.t);
        }
      }
      if (el.tagName === "IMG") node.src = el.getAttribute("src");
      out.push(node);
      for (const c of el.children) walk(c, depth + 1);
    };
    for (const c of root.children) walk(c, 0);
    return { root: { w: R(base.width), h: R(base.height) }, nodes: out };
  };

  let frame = document.getElementById("__pm_probe");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "__pm_probe";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1280px;height:900px;border:0;z-index:-1;opacity:0.01";
    document.body.appendChild(frame);
  }

  let ok = 0, err = [];
  for (const c of slice) {
    const argStr = Object.keys(c.args).map((k) => k + ":" + c.args[k]).join(";");
    const url = "/iframe.html?id=" + encodeURIComponent(c.story) +
      "&viewMode=story&args=" + encodeURIComponent(argStr);
    await new Promise((resolve) => {
      let done = false;
      const fin = () => { if (!done) { done = true; resolve(); } };
      frame.onload = () => setTimeout(fin, 500);
      frame.src = url;
      setTimeout(fin, 6000);
    });
    try {
      const data = measure(frame.contentDocument, frame.contentWindow);
      const variant = Object.keys(c.args).map((k) => k + "=" + c.args[k]).join(", ");
      const name = "props__" + c.comp + "__" + variant.replace(/[^A-Za-z0-9=,_-]/g, "_");
      await fetch("http://localhost:6100/save?name=" + encodeURIComponent(name), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comp: c.comp, story: c.story, variant: variant, args: c.args,
          root: data.root, nodes: data.nodes }),
      });
      ok++;
    } catch (e) {
      err.push(c.comp + " " + JSON.stringify(c.args) + ": " + e.message);
    }
  }
  return "전체 " + combos.length + " · 이번 구간 " + slice.length + " · 성공 " + ok +
    " · 실패 " + err.length + (err.length ? " | " + err.slice(0, 3).join(" ; ") : "");
})()
