/* Storybook 스토리의 실제 렌더 결과를 측정해 수집기로 보낸다.
   해석 없이 getBoundingClientRect + getComputedStyle 값만 쓴다. */
(async () => {
  const root =
    document.querySelector("#storybook-root") ||
    document.querySelector("#root") ||
    document.body;
  const base = root.getBoundingClientRect();
  const R = (n) => Math.round(n * 10) / 10;

  const rgba = (v) => {
    if (!v || v === "none") return null;
    const m = v.match(/rgba?\(([^)]+)\)/);
    if (!m) return v;
    const p = m[1].split(",").map((x) => parseFloat(x));
    if (p.length === 4 && p[3] === 0) return null; // 완전 투명은 버린다
    const hex =
      "#" + p.slice(0, 3).map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
    return p.length === 4 && p[3] < 1 ? { hex, a: R(p[3]) } : { hex };
  };

  const SKIP = new Set(["SCRIPT", "STYLE", "LINK", "META", "TITLE", "NOSCRIPT"]);
  const out = [];

  const walk = (el, depth) => {
    if (SKIP.has(el.tagName)) return;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden") return;
    const r = el.getBoundingClientRect();
    if (r.width < 0.5 && r.height < 0.5) return;

    // SVG는 마크업을 그대로 가져간다 (visx 차트 등은 이게 정답)
    if (el.tagName === "svg") {
      out.push({
        t: "svg", d: depth,
        x: R(r.left - base.left), y: R(r.top - base.top), w: R(r.width), h: R(r.height),
        svg: el.outerHTML,
      });
      return;
    }

    // 직속 텍스트 노드만 모은다 (자식 요소 텍스트는 그 자식이 담당)
    let own = "";
    for (const n of el.childNodes) {
      if (n.nodeType === 3) own += n.nodeValue;
    }
    own = own.replace(/\s+/g, " ").trim();

    const node = {
      t: el.tagName.toLowerCase(), d: depth,
      x: R(r.left - base.left), y: R(r.top - base.top), w: R(r.width), h: R(r.height),
    };
    const bg = rgba(s.backgroundColor);
    if (bg) node.bg = bg;
    if (s.backgroundImage && s.backgroundImage !== "none") node.bgImage = s.backgroundImage;
    const radii = [s.borderTopLeftRadius, s.borderTopRightRadius, s.borderBottomRightRadius, s.borderBottomLeftRadius]
      .map((v) => parseFloat(v) || 0);
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
      node.ff = s.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
      node.fg = rgba(s.color);
      node.lh = s.lineHeight === "normal" ? null : R(parseFloat(s.lineHeight));
      node.ls = s.letterSpacing === "normal" ? 0 : R(parseFloat(s.letterSpacing));
      node.ta = s.textAlign;
      if (s.fontVariantNumeric && s.fontVariantNumeric !== "normal") node.fvn = s.fontVariantNumeric;
    }
    if (el.tagName === "IMG") node.src = el.getAttribute("src");
    out.push(node);
    for (const c of el.children) walk(c, depth + 1);
  };

  for (const c of root.children) walk(c, 0);

  const name = new URLSearchParams(location.search).get("id") || "unknown";
  const payload = JSON.stringify({
    story: name, root: { w: R(base.width), h: R(base.height) }, nodes: out,
  });
  const res = await fetch("http://localhost:6100/save?name=" + encodeURIComponent(name), {
    method: "POST", headers: { "Content-Type": "application/json" }, body: payload,
  });
  return name + " → " + out.length + " nodes, " + payload.length + " bytes, " + (await res.text());
})()
