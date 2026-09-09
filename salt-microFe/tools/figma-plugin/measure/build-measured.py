#!/usr/bin/env python3
"""measured/*.json 을 code.js에 들어갈 MEASURED 상수로 묶는다.

사용법:
  1) python3 collector.py                          # 수집 서버 (:6100)
  2) pnpm --filter @repo/ui storybook              # Storybook (:6006)
  3) 브라우저에서 http://localhost:6006 을 열고 콘솔에:
        window.__SB_SLICE=[0,9999];
        eval(await (await fetch('http://localhost:6100/extract-all.js')).text())
  4) python3 build-measured.py                     # measured.js 생성
  5) measured.js 내용을 code.js 상단 MEASURED 상수로 교체
"""
import json, glob, os, pathlib

HERE = pathlib.Path(__file__).parent
OUT = HERE / "measured.js"


def meaningful(n):
    """계층(부모-자식)을 그대로 살려야 overflow:hidden 클리핑이 재현되므로
    그리는 게 없는 래퍼도 남긴다. 래퍼는 투명 프레임이 되어 해가 없다."""
    return True


def main():
    stories = {}
    for f in sorted(glob.glob(str(HERE / "measured" / "*.json"))):
        name = os.path.basename(f)[:-5]
        if name.startswith("ping"):
            continue
        d = json.load(open(f))
        nodes = [n for n in d["nodes"] if meaningful(n)]
        for n in nodes:
            # d(깊이)와 clip은 계층 복원·클리핑에 필요하므로 유지한다
            # 글자 박스가 요소 박스와 같으면 중복이므로 버린다
            if n.get("tx") == n.get("x") and n.get("ty") == n.get("y") \
               and n.get("tw") == n.get("w") and n.get("th") == n.get("h"):
                for k in ("tx", "ty", "tw", "th"):
                    n.pop(k, None)
            if "bc" in n and n.get("bw"):
                n["bc"] = [c.get("hex") if isinstance(c, dict) else c for c in n["bc"]]
            for k in ("bg", "fg"):
                if isinstance(n.get(k), dict) and "a" not in n[k]:
                    n[k] = n[k]["hex"]
        stories[name] = {"root": d["root"], "nodes": nodes}

    src = "const MEASURED = " + json.dumps(stories, ensure_ascii=False, separators=(",", ":")) + ";\n"
    OUT.write_text(src)
    total = sum(len(v["nodes"]) for v in stories.values())
    print(f"스토리 {len(stories)} · 렌더 노드 {total} · {len(src)//1024}KB → {OUT}")


if __name__ == "__main__":
    main()
