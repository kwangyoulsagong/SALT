/* 계층 렌더 결과의 절대 좌표가 측정값과 일치하는지 검산한다.
   목 하네스로 플러그인을 실행한 뒤, 만들어진 트리를 걸어
   각 프레임의 절대 좌표를 합산해 원본 측정값과 비교한다. */
const fs = require("fs");
const vm = require("vm");
const path = require("path");

const file = path.resolve(process.argv[2]);
const code = fs.readFileSync(file, "utf8");

// 목 하네스를 그대로 재사용하되, 종료 시 검산을 돌린다
const mockSrc = fs.readFileSync(path.resolve(__dirname, "mock-figma.js"), "utf8");
const patched = mockSrc
  .replace('const file = path.resolve(process.argv[2]);', 'const file = process.env.TARGET;')
  .replace(/setTimeout\(\(\) => \{[\s\S]*$/, `
setTimeout(() => {
  const page = figma.root.children.find((p) => p.name === "SALT Storybook");
  if (!page) { console.log("SALT Storybook 페이지 없음"); process.exit(1); }

  // MEASURED를 다시 읽어 비교 기준으로 쓴다
  const m = /const MEASURED = (\\{[\\s\\S]*?\\});\\n/.exec(fs.readFileSync(process.env.TARGET, "utf8"));
  const MEAS = JSON.parse(m[1]);

  let checked = 0, bad = [];
  const abs = (n) => {
    let x = 0, y = 0, cur = n;
    while (cur && cur.type !== "PAGE") {
      x += cur.x || 0; y += cur.y || 0;
      if (cur.parent && cur.parent.type === "PAGE") break;
      cur = cur.parent;
    }
    return { x, y };
  };

  // 스토리 캔버스를 이름으로 찾는다
  const canvases = {};
  const walk = (n) => {
    if (n.type === "COMPONENT" && typeof n.description === "string") {
      const id = n.description.split(" · ")[0];
      if (MEAS[id]) canvases[id] = n;
    }
    (n.children || []).forEach(walk);
  };
  (page.children || []).forEach(walk);

  for (const id of Object.keys(MEAS)) {
    const cv = canvases[id];
    if (!cv) { bad.push(id + ": 캔버스 없음"); continue; }
    const nodes = MEAS[id].nodes;
    if (!nodes.length) continue;
    // 오프셋은 렌더러가 가시범위로 계산하므로 여기서 되풀이하지 않는다.
    // 대신 첫 노드로 오프셋을 역산하고 나머지를 그 기준으로 검산한다
    // (오프셋과 무관하게 계층·상대좌표가 맞는지 보는 검사).
    // 캔버스 자손 중 프레임만 순서대로 모아 측정 노드와 대응시킨다
    const frames = [];
    const collect = (n) => {
      for (const c of n.children || []) {
        // svg 노드·변별 테두리·기호 벡터(한 글자 비ASCII)는 요소가 아니다
        const isGlyph = c.name.length <= 2 && /[^\x00-\x7F]/.test(c.name);
        if (c.type === "FRAME" && c.name !== "svg" && !/^border-/.test(c.name) && !isGlyph) frames.push(c);
        collect(c);
      }
    };
    collect(cv);
    const elems = nodes.filter((n) => n.t !== "svg");
    if (frames.length !== elems.length) {
      bad.push(id + ": 프레임 수 " + frames.length + " ≠ 측정 요소 " + elems.length);
      continue;
    }
    const cvAbs = abs(cv);
    const f0 = abs(frames[0]);
    const offX = (f0.x - cvAbs.x) - elems[0].x;
    const offY = (f0.y - cvAbs.y) - elems[0].y;
    for (let i = 0; i < elems.length; i++) {
      const got = abs(frames[i]);
      const dx = Math.abs((got.x - cvAbs.x) - (elems[i].x + offX));
      const dy = Math.abs((got.y - cvAbs.y) - (elems[i].y + offY));
      checked++;
      if (dx > 0.15 || dy > 0.15) {
        bad.push(id + " #" + i + " " + elems[i].t + ": Δ(" + dx.toFixed(1) + "," + dy.toFixed(1) + ")");
      }
    }
  }

  console.log("검산 노드:", checked);
  console.log("불일치:", bad.length);
  bad.slice(0, 12).forEach((b) => console.log("  ", b));
  process.exit(bad.length ? 1 : 0);
}, 800);
`);

const tmp = path.resolve(__dirname, "mock-verify.js");
fs.writeFileSync(tmp, patched);
process.env.TARGET = file;
process.env.CMD = "storybook";
process.env.FREE = "1";
require(tmp);
