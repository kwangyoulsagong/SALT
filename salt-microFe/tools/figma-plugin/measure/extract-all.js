/* 스토리 전체를 iframe으로 순회하며 측정 → 수집기로 POST.
   window.__SB_SLICE = [start, end] 로 구간을 나눠 실행한다. */
(async () => {
  const [START, END] = window.__SB_SLICE || [0, 9999];
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
        // Figma의 createNodeFromSvg는 CSS 변수(var(--x))와 외부 클래스를 해석하지 못한다.
        // 그래서 원본을 복제한 뒤 모든 노드의 fill·stroke를 computed 값으로 인라인한다.
        const clone = el.cloneNode(true);
        const srcAll = [el].concat(Array.prototype.slice.call(el.querySelectorAll("*")));
        const dstAll = [clone].concat(Array.prototype.slice.call(clone.querySelectorAll("*")));
        for (let i = 0; i < srcAll.length && i < dstAll.length; i++) {
          const cs = win.getComputedStyle(srcAll[i]);
          const d = dstAll[i];
          if (d.setAttribute) {
            for (const prop of ["fill", "stroke", "stroke-width", "stroke-opacity",
              "fill-opacity", "opacity", "stroke-linecap", "stroke-linejoin", "stroke-dasharray"]) {
              const v = cs.getPropertyValue(prop);
              if (v && v !== "none" && v.indexOf("var(") === -1) d.setAttribute(prop, v);
              else if (v === "none") d.setAttribute(prop, "none");
            }
            d.removeAttribute("class");
          }
        }
        out.push({ t: "svg", d: depth, x: R(r.left - base.left), y: R(r.top - base.top),
          w: R(r.width), h: R(r.height), svg: clone.outerHTML });
        return;
      }
      let own = "";
      let tRect = null;
      for (const n of el.childNodes) {
        if (n.nodeType !== 3) continue;
        own += n.nodeValue;
        if (!n.nodeValue.trim()) continue;
        // 패딩·정렬 때문에 요소 박스와 글자 박스가 다르다. 글자 박스를 직접 잰다.
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
        if (tRect) {
          node.tx = R(tRect.l - base.left);
          node.ty = R(tRect.t - base.top);
          node.tw = R(tRect.r - tRect.l);
          node.th = R(tRect.b - tRect.t);
        }
        node.fs = R(parseFloat(s.fontSize));
        node.fw = s.fontWeight;
        node.ff = s.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
        node.fg = rgba(s.color);
        node.lh = s.lineHeight === "normal" ? null : R(parseFloat(s.lineHeight));
        node.ls = s.letterSpacing === "normal" ? 0 : R(parseFloat(s.letterSpacing));
        node.ta = s.textAlign;
        if (s.fontVariantNumeric && s.fontVariantNumeric !== "normal") node.fvn = s.fontVariantNumeric;
      }
      if (el.tagName === "IMG") node.src = el.getAttribute("src");

      // ── 레이아웃 규칙. 오토레이아웃 컴포넌트로 재구성하기 위한 값들 ──
      node.disp = s.display;
      node.pos = s.position;
      const pad = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(
        function (v) { return Math.round((parseFloat(v) || 0) * 10) / 10; }
      );
      if (pad.some(function (v) { return v > 0; })) node.pad = pad;
      if (s.display === "flex" || s.display === "inline-flex") {
        node.fd = s.flexDirection;
        node.fw2 = s.flexWrap;
        node.jc = s.justifyContent;
        node.ai = s.alignItems;
        node.rg = Math.round((parseFloat(s.rowGap) || 0) * 10) / 10;
        node.cg = Math.round((parseFloat(s.columnGap) || 0) * 10) / 10;
      }
      if (s.display === "grid" || s.display === "inline-grid") {
        node.gtc = s.gridTemplateColumns;
        node.rg = Math.round((parseFloat(s.rowGap) || 0) * 10) / 10;
        node.cg = Math.round((parseFloat(s.columnGap) || 0) * 10) / 10;
      }
      const grow = parseFloat(s.flexGrow) || 0;
      if (grow > 0) node.grow = grow;
      const mg = [s.marginTop, s.marginRight, s.marginBottom, s.marginLeft].map(
        function (v) { return Math.round((parseFloat(v) || 0) * 10) / 10; }
      );
      if (mg.some(function (v) { return v !== 0; })) node.mg = mg;
      out.push(node);
      for (const c of el.children) walk(c, depth + 1);
    };
    for (const c of root.children) walk(c, 0);
    return { root: { w: R(base.width), h: R(base.height) }, nodes: out };
  };

  const idx = await (await fetch("/index.json")).json();
  const entries = idx.entries || idx.stories || {};
  const ids = Object.keys(entries)
    .filter((k) => (entries[k].type || "story") === "story")
    .sort()
    .slice(START, END);

  let frame = document.getElementById("__sb_probe");
  if (!frame) {
    frame = document.createElement("iframe");
    frame.id = "__sb_probe";
    frame.style.cssText = "position:fixed;left:0;top:0;width:1280px;height:900px;border:0;z-index:-1;opacity:0.01";
    document.body.appendChild(frame);
  }

  const log = [];
  for (const id of ids) {
    await new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      frame.onload = () => setTimeout(finish, 550); // 렌더 정착 대기
      frame.src = "/iframe.html?id=" + encodeURIComponent(id) + "&viewMode=story";
      setTimeout(finish, 6000); // 안전장치
    });
    try {
      const data = measure(frame.contentDocument, frame.contentWindow);
      const body = JSON.stringify(Object.assign({ story: id }, data));
      await fetch("http://localhost:6100/save?name=" + encodeURIComponent(id), {
        method: "POST", headers: { "Content-Type": "application/json" }, body: body,
      });
      log.push(id + ":" + data.nodes.length);
    } catch (e) {
      log.push(id + ":ERR " + e.message);
    }
  }
  return ids.length + " stories · " + log.filter((l) => l.indexOf("ERR") > -1).length + " errors" +
    (log.filter((l) => l.indexOf("ERR") > -1).slice(0, 5).join(" | ") || "");
})()
