#!/usr/bin/env python3
"""props__*.json 을 code.js의 MEASURED_PROPS 상수로 묶는다.

props-matrix.js 가 Storybook args로 prop을 주입해 렌더시킨 결과이므로,
"그 prop 조합으로 코드가 실제로 그린 것"의 측정값이다.

사용법:
  1) python3 collector.py                # 수집 서버 (:6100)
  2) pnpm --filter @repo/ui storybook     # Storybook (:6006)
  3) 브라우저 콘솔에서:
        window.__PM_SLICE=[0,9999];
        eval(await (await fetch('http://localhost:6100/props-matrix.js')).text())
  4) python3 build-props.py               # props.js 생성
"""
import json, glob, os, pathlib, collections

HERE = pathlib.Path(__file__).parent
OUT = HERE / "props.js"


def main():
    comps = collections.OrderedDict()
    files = sorted(glob.glob(str(HERE / "measured" / "props__*.json")))
    for f in files:
        d = json.load(open(f))
        for n in d["nodes"]:
            if "bc" in n and n.get("bw"):
                n["bc"] = [c.get("hex") if isinstance(c, dict) else c for c in n["bc"]]
            for k in ("bg", "fg"):
                if isinstance(n.get(k), dict) and "a" not in n[k]:
                    n[k] = n[k]["hex"]
        comps.setdefault(d["comp"], {})[d["variant"]] = {
            "root": d["root"], "nodes": d["nodes"], "args": d["args"],
        }

    src = "const MEASURED_PROPS = " + json.dumps(comps, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT.write_text(src)
    total = sum(len(v) for v in comps.values())
    nodes = sum(len(t["nodes"]) for v in comps.values() for t in v.values())
    print(f"컴포넌트 {len(comps)} · variant {total} · 노드 {nodes} · {len(src)//1024}KB → {OUT}")
    for c, v in comps.items():
        keys = sorted({k.split("=")[0] for name in v for k in name.split(", ")})
        print(f"   {c:16s} variant {len(v):3d}  props: {', '.join(keys)}")


if __name__ == "__main__":
    main()
