"use strict";

/**
 * DDD 레이어·컨텍스트 규칙 표 (`SRV-REQ-006` FR-10~FR-13).
 *
 * ## 소비자가 둘이다
 *
 * | 소비자 | 언제 |
 * |---|---|
 * | `.claude/hooks/layer-check.mjs` | Edit/Write **직전** — exit 2 로 차단 |
 * | ESLint `no-restricted-imports` (`.eslintrc.cjs` 생성기) | 에디터·CI |
 *
 * **표는 이 파일 하나**다. 프론트(`salt-microFe/packages/eslint-plugin-fsd/layer-rules.cjs`)와
 * 같은 방식이고, 레이어 이름만 다르다 — FSD 는 프론트 방법론이고 여기는 DDD 다.
 * 이름을 통일하지 않는 이유는 `layered-architecture.md` 첫 절에 있다.
 */

/** 컨텍스트 내부 레이어. 선형이 아니다 (§의존 방향). */
const LAYERS = ["domain", "application", "infrastructure", "presentation"];

/**
 * 컨텍스트 레지스트리 (`server-architecture.md` §2).
 * **새 컨텍스트는 규칙 문서의 표에 먼저 추가한다.**
 */
const CONTEXTS = [
  "auth",
  "ledger",
  "portfolio",
  "market",
  "coach",
  "invoice",
  "tax",
  "plan",
  "indicator",
  "fx",
  "goal",
  "news",
  "notification",
  "device",
];

/** 조합 컨텍스트 — Aggregate 없이 `application`(+`presentation`)만 갖는다. */
const COMPOSITE_CONTEXTS = ["homebriefing", "onboarding"];

const ALL_CONTEXTS = [...CONTEXTS, ...COMPOSITE_CONTEXTS];

/** 아직 옮기지 않은 구역. 규칙을 적용하지 않는다. */
const LEGACY_ROOTS = ["modules", "external", "workers"];

/** `domain` 에 들어오면 안 되는 패키지 (`server-architecture.md` §3). */
const DOMAIN_FORBIDDEN_PACKAGES = [
  "@prisma/client",
  "express",
  "axios",
  "zod",
  "node-cron",
  "jsonwebtoken",
  "bcryptjs",
];

/** 레이어가 자기보다 안쪽으로만 의존한다는 표. 값에 없으면 금지다. */
const ALLOWED_LAYER_TARGETS = {
  domain: ["domain"],
  application: ["domain", "application"],
  infrastructure: ["domain", "infrastructure"],
  presentation: ["domain", "application", "presentation"],
};

/** `salt-server/src/tax/domain/CostBasisLot.ts` → 컨텍스트·레이어 */
const locate = (filePath) => {
  const normalized = filePath.split("\\").join("/");
  const match = normalized.match(/(?:^|\/)salt-server\/src\/(.+)$/);
  if (!match) return null;

  const rel = match[1];
  const parts = rel.split("/");
  const head = parts[0];

  if (LEGACY_ROOTS.includes(head)) return { area: "legacy", rel, root: head };
  if (parts.length === 1) return { area: "entry", file: head, rel };
  if (head === "shared") return { area: "shared", layer: parts[1], rel };
  return { area: "context", context: head, layer: parts[1] ?? null, rel };
};

/** 상대 경로를 `salt-server/src` 기준으로 정규화한다. */
const normalize = (path) => {
  const out = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
};

const resolveRelative = (filePath, source) => {
  const normalized = filePath.split("\\").join("/");
  const dir = normalized.split("/").slice(0, -1).join("/");
  return normalize(`${dir}/${source}`);
};

/**
 * 한 import 를 판정한다. 위반이면 `{ rule, message }`, 아니면 `null`.
 */
const checkImport = (filePath, source) => {
  const here = locate(filePath);
  if (!here) return null;

  const isRelative = source.startsWith(".");

  // FR-11 — domain 에 프레임워크·DB 를 들이지 않는다 (§3)
  if (
    (here.area === "context" || here.area === "shared") &&
    here.layer === "domain" &&
    !isRelative
  ) {
    const forbidden = DOMAIN_FORBIDDEN_PACKAGES.find(
      (pkg) => source === pkg || source.startsWith(`${pkg}/`)
    );
    if (forbidden) {
      return {
        rule: "domain-framework",
        message: `'${source}' — \`domain\` 은 프레임워크와 DB 모양을 모른다. 그 모양이 도메인으로 번지는 것을 막는 것이 이 전환의 목적이다 (server-architecture.md §3). 허용되는 예외는 \`decimal.js\` 하나다.`,
      };
    }
  }

  if (!isRelative) return null;

  // `resolveRelative` 는 이미 파일 경로 기준으로 정규화된 전체 경로를 준다.
  // 다시 `salt-server/src/` 를 붙이면 컨텍스트 이름이 한 칸씩 밀린다.
  const resolved = resolveRelative(filePath, source);
  const target = locate(resolved);
  if (!target) return null;

  // FR-11 — shared 는 아무 컨텍스트도 모른다
  if (here.area === "shared" && target.area === "context") {
    return {
      rule: "shared-to-context",
      message: `'${source}' — Shared Kernel 이 특정 도메인(\`${target.context}\`)을 알면 커널이 아니다 (ddd-shared.md §1).`,
    };
  }

  if (here.area !== "context") return null;

  // FR-11 — 컨텍스트 → 다른 컨텍스트는 `application/api` 만
  if (target.area === "context" && target.context !== here.context) {
    const viaPublicApi = target.rel.startsWith(
      `${target.context}/application/api`
    );
    if (!viaPublicApi) {
      return {
        rule: "cross-context",
        message: `'${source}' — 컨텍스트 밖으로 열리는 것은 \`${target.context}/application/api\` 뿐이다. 남의 Aggregate·리포지토리·컨트롤러를 부르면 경계가 이름만 남는다 (server-architecture.md §4).`,
      };
    }
    if (here.layer === "presentation") {
      return {
        rule: "presentation-cross-context",
        message: `'${source}' — \`presentation\` 은 남의 컨텍스트를 부르지 않는다. 공개 API 를 부를 수 있는 것은 \`application\` 과 \`infrastructure\` 뿐이고, 이 조합이 필요하면 그건 **조합 컨텍스트**의 일이다 (server-architecture.md §4).`,
      };
    }
    return null;
  }

  // 같은 컨텍스트 안에서의 레이어 방향
  if (target.area === "context" && target.context === here.context) {
    if (!here.layer || !target.layer) return null;
    if (!LAYERS.includes(target.layer)) return null;
    const allowed = ALLOWED_LAYER_TARGETS[here.layer];
    if (allowed && !allowed.includes(target.layer)) {
      return {
        rule: `${here.layer}-to-${target.layer}`,
        message: `'${source}' — \`${here.layer}\` 는 \`${target.layer}\` 를 import 하지 않는다. ${explainDirection(here.layer, target.layer)}`,
      };
    }
  }

  return null;
};

const explainDirection = (from, to) => {
  if (from === "domain") {
    return "도메인이 자기 밖을 알면 단독으로 추론·테스트할 수 없다.";
  }
  if (from === "application" && to === "infrastructure") {
    return "의존 역전 위반이다. Port 를 `domain` 에 두고 뒤집는다.";
  }
  if (from === "presentation" && to === "infrastructure") {
    return "컨트롤러가 리포지토리를 직접 잡는다. `application` 을 거친다.";
  }
  return "의존 방향 위반이다.";
};

/** 파일이 놓인 자리 자체가 규칙을 어기는지 본다. */
const checkLocation = (filePath) => {
  const here = locate(filePath);
  if (!here || here.area !== "context") return null;

  if (!ALL_CONTEXTS.includes(here.context)) {
    return {
      rule: "registry",
      message: `\`src/${here.context}\` — 레지스트리에 없는 컨텍스트다. \`server-architecture.md\` §2 표에 먼저 추가한다 (FR-13).`,
    };
  }

  if (here.layer && !LAYERS.includes(here.layer)) {
    return {
      rule: "unknown-layer",
      message: `\`${here.context}/${here.layer}\` — 컨텍스트 안의 레이어는 ${LAYERS.join(" · ")} 뿐이다 (FR-1).`,
    };
  }

  if (COMPOSITE_CONTEXTS.includes(here.context) && here.layer === "domain") {
    return {
      rule: "composite-domain",
      message: `\`${here.context}/domain\` — 조합 컨텍스트는 Aggregate 를 갖지 않는다. 조립이 행을 남기면 **그 행의 주인을 먼저 찾는다** (server-architecture.md §2).`,
    };
  }

  return null;
};

/** 소스에서 import/re-export/동적 import 의 경로만 뽑는다. */
const extractImportSources = (code) => {
  const sources = [];
  const patterns = [
    /(?:^|\n)\s*import\s+[^;'"]*from\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*import\s*["']([^"']+)["']/g,
    /(?:^|\n)\s*export\s+[^;'"]*from\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(code)) !== null) sources.push(match[1]);
  }
  return sources;
};

module.exports = {
  ALL_CONTEXTS,
  COMPOSITE_CONTEXTS,
  CONTEXTS,
  DOMAIN_FORBIDDEN_PACKAGES,
  LAYERS,
  LEGACY_ROOTS,
  checkImport,
  checkLocation,
  extractImportSources,
  locate,
};
