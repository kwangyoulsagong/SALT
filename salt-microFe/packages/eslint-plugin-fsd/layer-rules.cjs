"use strict";

/**
 * FSD 레이어·슬라이스 규칙 표 (`FE-REQ-009` FR-20~FR-26).
 *
 * ## 소비자가 둘이다
 *
 * | 소비자 | 언제 | 어디서 |
 * |---|---|---|
 * | `.claude/hooks/layer-check.mjs` | Edit/Write **직전** | 에이전트가 쓰기 전에 exit 2 로 차단 |
 * | `@repo/fsd/layers` ESLint 규칙 | 에디터·CI | 사람이 타이핑하는 중 |
 *
 * **겹치는 것은 의도적이다** — 피드백 시점이 다르다. 대신 **표는 이 파일 하나**다.
 * 미러를 만들면 한쪽만 고쳐지는 사고가 난다(레포 CLAUDE.md, Codex 하네스 제거 기록).
 *
 * CommonJS 인 이유는 앱이 eslintrc 모드를 쓰고 **eslintrc 는 ESM 플러그인을 로드하지
 * 못하기 때문**이다. ESM 쪽(훅)이 `createRequire` 로 이 파일을 읽는다.
 * REQ 는 `layer-rules.mjs` 를 적었지만 그러면 표가 두 벌이 된다.
 */

/** 아래에서 위로. 인덱스가 rank 다. */
const LAYERS = [
  "shared",
  "entities",
  "features",
  "widgets",
  "pages",
  "app",
];

/** `shared` 는 슬라이스가 아니라 flat 세그먼트다 (`fsd-shared.md`). */
const SHARED_SEGMENTS = ["api", "config", "i18n", "lib", "model", "ui"];

/**
 * 슬라이스 레지스트리 (`layered-architecture.md` §4).
 * **새 슬라이스는 규칙 문서의 표에 먼저 추가한다.**
 */
const REGISTRY = {
  entities: [
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
  ],
  features: [
    "import-ledger",
    "register-exchange-key",
    "solve-harvest",
    "simulate-crypto-scenario",
    "ask-coach",
    "rate-recommendation",
    "run-preflight",
    "complete-weekly-plan",
    "edit-plan-settings",
    "add-goal",
    "toggle-watchlist",
    "accept-invite",
    "arrange-panels",
    "sign-in",
  ],
  widgets: [
    "home-briefing",
    "coach-console",
    "asset-workspace",
    "market-board",
    "onboarding-flow",
    "pc-panel-grid",
  ],
  pages: [
    "home",
    "coach",
    "assets",
    "goals",
    "add-goal",
    "investments",
    "tax",
    "onboarding",
    "login",
    "streaming-probe",
  ],
};

/** 루트 라우팅 파일이 import 해도 되는 것. 그 외는 전부 막는다 (FR-25). */
const ROUTING_ALLOWED_ALIAS = ["@/pages", "@/app"];

const rankOf = (layer) => LAYERS.indexOf(layer);

/** `a/b/../c` → `a/c`. node 의 path 를 쓰지 않는 이유는 Windows 구분자를 이미 정규화했기 때문이다. */
const normalize = (path) => {
  const out = [];
  for (const part of path.split("/")) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
};

/**
 * 상대 경로 import 가 가리키는 곳.
 *
 * **상대 경로도 경계를 넘을 수 있다** — `../../../../web/src/shared/ui` 는 alias 를
 * 쓰지 않고 zone 을 넘는다. 정규화해서 같은 판정을 태운다.
 */
const resolveRelative = (filePath, source) => {
  const normalizedFile = filePath.split("\\").join("/");
  const dir = normalizedFile.split("/").slice(0, -1).join("/");
  return normalize(`${dir}/${source}`);
};

/**
 * 상대 경로로 벗어날 수 없는 단위.
 *
 * - `app` 레이어는 슬라이스가 없다 → `src/app` 전체가 한 단위
 * - `shared` 는 flat 세그먼트 → `src/shared/<segment>`
 * - 나머지는 슬라이스 → `src/<layer>/<slice>`
 */
const unitOf = (location) => {
  if (!location || location.area !== "src" || !location.layer) return null;
  if (location.layer === "app") return "src/app";
  if (!location.slice) return null;
  return `src/${location.layer}/${location.slice}`;
};

/** `apps/web/src/entities/market/ui/PriceCell.tsx` → 앱·영역·레이어·슬라이스 */
const locate = (filePath) => {
  const normalized = filePath.split("\\").join("/");
  const match = normalized.match(/(?:^|\/)apps\/([^/]+)\/(.+)$/);
  if (!match) return null;

  const [, app, rest] = match;
  const parts = rest.split("/");

  if (parts[0] === "src") {
    const layer = parts[1];
    if (!LAYERS.includes(layer)) {
      return { app, area: "src", layer: null, slice: null, unknownLayer: parts[1] };
    }
    const slice = layer === "shared" ? parts[2] : parts[2];
    return { app, area: "src", layer, slice: slice || null };
  }

  if (parts[0] === "app" || parts[0] === "pages") {
    return { app, area: "routing", routingDir: parts[0], file: parts[parts.length - 1] };
  }

  return { app, area: "other" };
};

/** `@/entities/market/model/types` → { layer, slice, deeper } */
const parseAliasImport = (source) => {
  if (!source.startsWith("@/")) return null;
  const parts = source.slice(2).split("/");
  const layer = parts[0];
  if (!LAYERS.includes(layer)) return null;
  return { layer, slice: parts[1] || null, deeper: parts.slice(2) };
};

/**
 * 한 import 를 판정한다. 위반이면 `{ rule, message }`, 아니면 `null`.
 *
 * `filePath` 는 레포 어디를 기준으로 해도 된다 — `apps/<app>/` 이후만 본다.
 */
const checkImport = (filePath, source) => {
  const here = locate(filePath);
  if (!here) return null;

  const isRelative = source.startsWith(".");
  const resolved = isRelative ? resolveRelative(filePath, source) : source;

  // FR-23 · FR-24 — 앱(zone) 경계는 어디서든 넘지 못한다. 상대 경로도 마찬가지다.
  const crossApp = resolved.match(/apps\/([^/]+)\/src/);
  if (crossApp && crossApp[1] !== here.app) {
    return {
      rule: "cross-app",
      message: `'${source}' — zone 은 독립 배포 단위다. 다른 앱의 \`src\` 를 직접 import 하지 않는다. 공유는 workspace 패키지로만 한다 (FR-23).`,
    };
  }
  if (here.app === "mobile" && /^@repo\/ui(\/|$)/.test(source)) {
    return {
      rule: "rn-web-cross",
      message: `'${source}' — \`apps/mobile\` 은 \`@repo/ui\` 를 import 하지 않는다. vanilla-extract 는 RN 에서 동작하지 않는다. 토큰은 \`@repo/tokens\` 로 공유한다 (FR-24).`,
    };
  }

  // FR-25 — 루트 라우팅 파일은 연결만 한다
  if (here.area === "routing") {
    const isBareAlias = source.startsWith("@/");
    if (!isBareAlias) return null;
    const allowed = ROUTING_ALLOWED_ALIAS.some(
      (prefix) => source === prefix || source.startsWith(prefix + "/")
    );
    if (!allowed) {
      return {
        rule: "routing-shell",
        message: `'${source}' — 루트 \`${here.routingDir}/\` 는 라우팅 파일이다. \`@/pages/*\` 와 \`@/app/*\` 만 import 한다. 화면은 \`src/pages\` 슬라이스에 둔다 (FR-12 · FR-25).`,
      };
    }
    return null;
  }

  if (here.area !== "src" || !here.layer) return null;

  // FR-22 — 다른 레이어·슬라이스는 반드시 alias 로 참조한다
  if (isRelative) {
    const unit = unitOf(here);
    if (unit && !resolved.includes(`/${unit}/`) && !resolved.endsWith(`/${unit}`)) {
      return {
        rule: "relative-escape",
        message: `'${source}' — 상대 경로가 \`${unit}\` 를 벗어난다. 다른 레이어·슬라이스는 alias(\`@/<layer>/<slice>\`)로 참조한다 (FR-22).`,
      };
    }
    return null;
  }

  const target = parseAliasImport(source);
  if (!target) return null;

  const hereRank = rankOf(here.layer);
  const targetRank = rankOf(target.layer);

  // FR-2 — 의존은 아래로만 흐른다
  if (targetRank > hereRank) {
    return {
      rule: "upper-layer",
      message: `'${source}' — \`${here.layer}\`(${hereRank}) 가 상위 레이어 \`${target.layer}\`(${targetRank}) 를 import 했다. 의존은 아래로만 흐른다 (FR-2).`,
    };
  }

  if (target.layer === "shared") {
    // shared 는 flat 세그먼트다. 공개 단위는 `@/shared/<segment>`.
    if (target.slice && !SHARED_SEGMENTS.includes(target.slice)) {
      return {
        rule: "shared-segment",
        message: `'${source}' — \`shared\` 의 세그먼트는 ${SHARED_SEGMENTS.join(" · ")} 뿐이다 (\`fsd-shared.md\`).`,
      };
    }
    // 예외: vanilla-extract 토큰. barrel 로 가져오면 `.css.ts` 빌드 그래프에 React 가 들어온다.
    const isStyleModule = /\.css$/.test(source);
    if (target.deeper.length > 0 && !isStyleModule) {
      return {
        rule: "segment-internal",
        message: `'${source}' — 세그먼트 내부 경로를 직접 찌르지 않는다. \`@/shared/${target.slice}\` 로 들어온다 (FR-4). 예외는 \`*.css\` 토큰 모듈뿐이다.`,
      };
    }
    return null;
  }

  // FR-3 — 같은 레이어의 다른 슬라이스를 직접 import 하지 않는다
  if (targetRank === hereRank) {
    if (target.slice && target.slice !== here.slice) {
      return {
        rule: "cross-slice",
        message: `'${source}' — 같은 레이어(\`${here.layer}\`)의 다른 슬라이스다. 공통이 필요하면 아래 레이어로 내린다 (FR-3).`,
      };
    }
    return {
      rule: "self-alias",
      message: `'${source}' — 같은 슬라이스 내부는 상대 경로로 참조한다. alias 는 다른 레이어를 가리킬 때만 쓴다 (FR-22).`,
    };
  }

  // FR-4 — 슬라이스는 barrel 로만 연다
  if (target.deeper.length > 0) {
    return {
      rule: "slice-internal",
      message: `'${source}' — 슬라이스 내부 경로를 직접 찌르지 않는다. \`@/${target.layer}/${target.slice}\` barrel 로 들어온다 (FR-4).`,
    };
  }

  // FR-26 — 레지스트리에 없는 슬라이스
  if (target.slice && REGISTRY[target.layer] && !REGISTRY[target.layer].includes(target.slice)) {
    return {
      rule: "registry",
      message: `'${source}' — 레지스트리에 없는 슬라이스다. \`layered-architecture.md\` §4 표에 먼저 추가한다 (FR-26).`,
    };
  }

  return null;
};

/** 파일이 놓인 자리 자체가 규칙을 어기는지 본다 (레이어 이름·레지스트리). */
const checkLocation = (filePath) => {
  const here = locate(filePath);
  if (!here || here.area !== "src") return null;

  if (here.unknownLayer) {
    return {
      rule: "unknown-layer",
      message: `\`src/${here.unknownLayer}\` — \`src\` 의 최상위는 6레이어(${LAYERS.join(" · ")})뿐이다 (FR-1).`,
    };
  }
  if (!here.layer || here.layer === "shared" || !here.slice) return null;

  const allowed = REGISTRY[here.layer];
  if (allowed && !allowed.includes(here.slice)) {
    return {
      rule: "registry",
      message: `\`${here.layer}/${here.slice}\` — 레지스트리에 없는 슬라이스다. \`layered-architecture.md\` §4 표에 먼저 추가한다 (FR-26).`,
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
  LAYERS,
  REGISTRY,
  ROUTING_ALLOWED_ALIAS,
  SHARED_SEGMENTS,
  checkImport,
  checkLocation,
  extractImportSources,
  locate,
  rankOf,
};
