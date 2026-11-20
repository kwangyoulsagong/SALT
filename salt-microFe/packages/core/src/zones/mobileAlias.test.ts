import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * 휴대폰 zone 한 빌드가 도메인 패키지 셋을 같이 조립한다(`FE-REQ-072` FR-1, `ADR-012`). 패키지 안 레이어 alias(`@/entities/goal` …)는
 * `apps/web-mobile/tsconfig.json` `paths` 의 **폴백 배열**(저축 → 가계부 → 투자 차례로 찾아 처음 있는 곳)로 푼다.
 * 이 풀이가 맞으려면 **레이어마다 슬라이스 이름이 패키지 사이에서 유일**해야 한다 — 겹치면 뒤 패키지의 import 가 앞 패키지 슬라이스로 조용히 풀린다.
 */
const MICRO_FE = join(__dirname, "../../../..");
const MOBILE_PACKAGES = ["domain-savings", "domain-household", "domain-invest"];
const ALIAS_LAYERS = ["entities", "features", "widgets"];

const slicesOf = (pkg: string, layer: string): string[] => {
  const dir = join(MICRO_FE, "packages", pkg, "src", layer);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((name) => statSync(join(dir, name)).isDirectory());
};

describe("휴대폰 zone alias 폴백(FE-REQ-072 FR-1)", () => {
  it.each(ALIAS_LAYERS)("%s — 슬라이스 이름이 도메인 패키지 사이에서 겹치지 않는다", (layer) => {
    const owners = new Map<string, string[]>();
    for (const pkg of MOBILE_PACKAGES) {
      for (const slice of slicesOf(pkg, layer)) owners.set(slice, [...(owners.get(slice) ?? []), pkg]);
    }
    const clashes = [...owners].filter(([, pkgs]) => pkgs.length > 1).map(([slice, pkgs]) => `${layer}/${slice}: ${pkgs.join(" · ")}`);
    expect(clashes, `겹치는 슬라이스 — 이름을 바꾸거나 휴대폰 zone 조립을 다시 설계한다:\n${clashes.join("\n")}`).toEqual([]);
  });

  it("tsconfig paths 가 레이어마다 패키지 셋을 같은 차례로 가리킨다", () => {
    const tsconfig = JSON.parse(readFileSync(join(MICRO_FE, "apps/web-mobile/tsconfig.json"), "utf8")) as {
      compilerOptions: { paths: Record<string, string[]> };
    };
    const { paths } = tsconfig.compilerOptions;
    for (const layer of ALIAS_LAYERS) {
      expect(paths[`@/${layer}/*`]).toEqual(MOBILE_PACKAGES.map((pkg) => `../../packages/${pkg}/src/${layer}/*`));
      expect(paths[`@/${layer}`]).toEqual(MOBILE_PACKAGES.map((pkg) => `../../packages/${pkg}/src/${layer}`));
    }
    // 휴대폰 zone 이 데스크톱 화면(`pages`)을 풀 길이 없다 — 진입점은 `@repo/domain-*/mobile/*` 로만
    expect(Object.keys(paths).some((key) => key.startsWith("@/pages"))).toBe(false);
  });
});
