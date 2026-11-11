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
 *
 * ## 축이 둘이다 (`FE-REQ-052` FR-4, `ADR-005` §2)
 *
 * - **레이어 축** — FSD 6레이어 · 슬라이스 (아래 대부분)
 * - **도메인 축** — `domain-*` 끼리 금지 · 셸 → `domain-*` 금지 · zone 앱은 자기 도메인 패키지만 ·
 *   zone 앱 `src/{entities,features,widgets}` 금지. 도메인 목록은 zone 레지스트리(`registry.json`)에서 온다
 *
 * ## 레이어가 앱 밖 패키지에도 있다 (`FE-REQ-053`)
 *
 * | 위치 | 레이어 | 단위 |
 * |---|---|---|
 * | `apps/<app>/src/<layer>/<slice>` | 6레이어 | 슬라이스 |
 * | `packages/domain-<x>/src/<layer>/<slice>` | `entities` · `features` · `widgets` · `pages` | 슬라이스 |
 * | `packages/web-shared/src/<segment>` | `shared` 하나(+ `layout` — 공용 레이아웃) | 패키지 전체 |
 *
 * `@repo/web-shared/<segment>` 는 `@/shared/<segment>` 와 같은 판정을 탄다 — 세그먼트 내부 경로 금지(`*.css` 예외).
 */

const zones = require("../core/src/zones/registry.cjs");

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
    "portfolio",
    "market",
    "coach",
    "plan",
    "indicator",
    "fx",
    "goal",
    "news",
    "notification",
    "device",
    // 셸 홈 요약 카드 조회 · 표시 — 도메인을 모르는 카드 계약(`FE-REQ-055`)
    "home",
    // 가계부 — 지출 · 봉투 · 착지 구간(`FE-REQ-057`, 2026-11-04). 서버 컨텍스트와 같은 이름(루트 CLAUDE.md)
    "household",
    // 금융 팁 — 공개 글 · 메타 · 확인 필요(`FE-REQ-058`, 2026-11-05 금융 팁 S2a). 서버는 `content` 서비스(글 하나 = tip)
    "tip",
  ],
  features: [
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
    // "sign-out" — 헤더 프로필 메뉴는 zone 이 같이 쓴다 → `@repo/web-shared/layout` (FE-REQ-053)
    "search-asset",
    "toggle-news-bookmark",
    "switch-coach-mode",
    // 사기 전 · 팔기 전 점검 — 방향 전환 · 펼침(F017 v2 단계 2 `FE-REQ-064` FR-3, 2026-11-11). 숫자 · 문장은 서버
    "check-trade-odds",
    "explain-symbol",
    "regenerate-coach",
    "record-transaction",
    // 저축 적립 — 단건 · 여러 목표 나눠 넣기(`FE-REQ-056` FR-4, 2026-11-03)
    "record-deposit",
    // 저축 S1b(`FE-REQ-056` FR-6 · 7 · 9, 2026-11-03) — 목표 저울 확정 · 실물 단위 만들기/지우기 · 비상시 비교(저장 없는 서버 계산)
    "rebalance-goals",
    "add-item-unit",
    "compare-emergency",
    // 가계부(`FE-REQ-057`, 2026-11-04) — 지출 적기(바로 · 한 줄 · 결제 문자 붙여넣기 · 지우기) · 예산 정하기
    "record-expense",
    "edit-budget",
    // 가계부 S1b(2026-11-04) — 반복 템플릿 · 예정 확인 / 월 마감 리뷰
    "manage-recurring",
    "close-month",
    // 가계부 S1c(2026-11-04) — 다음 날 만족 답하기 · 안 쓴 날 표시 · 노동시간 설정
    "answer-feeling",
    "mark-no-spend",
    "set-work-hours",
    // 가계부 S1d(2026-11-04) — 챌린지 고르기 / 한 날 · 아낀 돈 · 목표에 보태기 · 그만두기
    "start-challenge",
    "track-challenge",
    // 가계부 S1e(2026-11-04) — 고정비 찾기: 반복으로 옮기기 · 아니에요 숨기기 · 되돌리기
    "find-fixed-cost",
    // 가계부 S1f(2026-11-05) — 내 분류 만들기 · 고치기 · 지우기(보관)
    "manage-categories",
    // 가계부 S1g(2026-11-05) — 이야기 카드 금액 보이기 · 이미지로 공유
    "share-story",
    // 가계부 S1h — 리볼빙 명세서 적기 · 고치기 · 끝내기 / 사람 장부 적기 · 고치기 · 지우기 / 해 경조사 봉투
    "manage-revolving",
    "record-gift",
    "set-occasion-envelope",
    // 금융 팁 S2b(2026-11-05) — 읽기 전에 맞혀 보기(채점은 서버 · 로그인이면 카드로)
    "answer-quiz",
    // 금융 팁 S2d(2026-11-05) — 내 숫자로 다시 읽기(계산은 서버 · 로그인일 때만)
    "read-my-numbers",
    "set-risk-budget",
    "confirm-outcome-tags",
    "toggle-purchase-price",
    "edit-coach-profile",
    "mark-alert-read",
    "toggle-alerts",
    // 셸 S3a(2026-11-06) — 온보딩 도메인 고르기 · 끝내기(옛 3스텝의 "건너뛰기" `skip-onboarding-step` 은 만들지 않고 이 "나중에 하기"로 대체) / 홈 카드 순서 · 숨김
    "choose-domains",
    "arrange-home",
  ],
  widgets: [
    "home-briefing",
    "coach-console",
    "asset-workspace",
    "market-board",
    "asset-search",
    "onboarding-flow",
    "pc-panel-grid",
    "coach-panel",
    "symbol-analysis",
    "judgment-overview",
    "position-overview",
    "market-list",
    "app-header",
    "alert-list",
    "settings-panel",
    "transaction-list",
  ],
  pages: [
    "home",
    "coach",
    "assets",
    "goals",
    "add-goal",
    // 저축 목표 상세 `/goals/[id]`(`FE-REQ-056`, 2026-11-03)
    "goal-detail",
    // 가계부 `/household` · `/household/month/[ym]` · `/household/new` · `/household/budget`(`FE-REQ-057`, 2026-11-04)
    "household",
    "new-expense",
    "budget",
    // 가계부 S1b — `/household/templates`(2026-11-04)
    "recurring",
    // 가계부 S1d — `/household/challenges`(2026-11-04)
    "challenges",
    // 가계부 S1g — `/household/story/[period]`(2026-11-05)
    "story",
    // 가계부 S1h — /household/revolving · /household/people
    "revolving",
    "people",
    // 금융 팁 `/tips` · `/tips/[slug]`(`FE-REQ-058`, 2026-11-05)
    "tips",
    "tip-detail",
    // 금융 팁 S2b — `/tips/cards` 맞힌 카드 모음(2026-11-05)
    "quiz-cards",
    "investments",
    "investment-detail",
    // 투자 포트폴리오 `/portfolio` — 내 보유를 코치 리포트에서 뗐다(`FE-REQ-069`, 2026-11-10)
    "portfolio",
    "search",
    "settings",
    "onboarding",
    "login",
    "streaming-probe",
    // "not-found" — 404 는 zone 이 같이 쓴다 → `@repo/web-shared/layout` (FE-REQ-044 P-15 → FE-REQ-053)
  ],
};

/** 웹 shared 레이어 패키지 (`FE-REQ-053`). 셸과 도메인 zone 이 같이 쓴다 */
const WEB_SHARED_PACKAGE = "@repo/web-shared";

/**
 * `@repo/web-shared` 의 공개 단위 — shared 세그먼트 + `layout`(zone 루트 레이아웃이 같이 쓰는 것: 프로바이더 · 프레임 · 프로필 메뉴 · 404 · 글꼴).
 * `layout` 은 zone 루트 레이아웃이 같이 쓰는 자리로 남는다 — 탭 · 머리 표시는 `@repo/ui` `AppNavigation`, 판정 · 규칙은 여기(`FE-REQ-054`).
 */
const WEB_SHARED_ENTRIES = [...SHARED_SEGMENTS, "layout"];

/** 도메인 패키지 안에 둘 수 있는 레이어. shared 는 `@repo/web-shared`, app 은 zone 앱이 갖는다 */
const DOMAIN_PACKAGE_LAYERS = ["entities", "features", "widgets", "pages"];

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
 * 상대 경로로 벗어날 수 없는 단위 — `locate` 가 `root`(src 까지의 경로)를 준다.
 *
 * - `app` 레이어는 슬라이스가 없다 → `src/app` 전체가 한 단위
 * - `shared` 는 flat 세그먼트 → `src/shared/<segment>`
 * - `@repo/web-shared` 는 패키지 전체가 shared 한 단위 — 세그먼트끼리 상대 경로로 잇는다(alias 가 없다)
 * - 나머지는 슬라이스 → `src/<layer>/<slice>`
 */
const unitOf = (location) => {
  if (!location || location.area !== "src" || !location.layer) return null;
  if (location.webShared) return location.root;
  if (location.layer === "app") return `${location.root}/app`;
  if (!location.slice) return null;
  return `${location.root}/${location.layer}/${location.slice}`;
};

/** `apps/web/src/entities/market/ui/PriceCell.tsx` → 앱·영역·레이어·슬라이스 */
const locate = (filePath) => {
  const normalized = filePath.split("\\").join("/");

  // FE-REQ-053 — 웹 shared 레이어 패키지. 패키지 전체가 shared 한 레이어다
  const sharedMatch = normalized.match(/(?:^|\/)packages\/web-shared\/(.+)$/);
  if (sharedMatch) {
    const parts = sharedMatch[1].split("/");
    if (parts[0] !== "src") return { app: null, area: "other", webShared: true };
    return {
      app: null,
      area: "src",
      layer: "shared",
      slice: parts[1] || null,
      webShared: true,
      root: "packages/web-shared/src",
    };
  }

  const domainMatch = normalized.match(/(?:^|\/)packages\/(domain-[^/]+)\/(.+)$/);
  if (domainMatch) {
    const domainPackage = `@repo/${domainMatch[1]}`;
    const parts = domainMatch[2].split("/");
    if (parts[0] !== "src") return { app: null, domainPackage, area: "other" };
    const root = `packages/${domainMatch[1]}/src`;
    // FE-REQ-053 — 패키지 안도 FSD. shared · app 은 패키지 밖(`@repo/web-shared` · zone 앱)에 있다
    if (!DOMAIN_PACKAGE_LAYERS.includes(parts[1])) {
      return { app: null, domainPackage, area: "src", layer: null, slice: null, unknownLayer: parts[1], root };
    }
    return { app: null, domainPackage, area: "src", layer: parts[1], slice: parts[2] || null, root };
  }

  const match = normalized.match(/(?:^|\/)apps\/([^/]+)\/(.+)$/);
  if (!match) return null;

  const [, app, rest] = match;
  const parts = rest.split("/");
  const root = `apps/${app}/src`;

  if (parts[0] === "src") {
    const layer = parts[1];
    if (!LAYERS.includes(layer)) {
      return { app, area: "src", layer: null, slice: null, unknownLayer: parts[1], root };
    }
    return { app, area: "src", layer, slice: parts[2] || null, root };
  }

  if (parts[0] === "app" || parts[0] === "pages") {
    return { app, area: "routing", routingDir: parts[0], file: parts[parts.length - 1] };
  }

  return { app, area: "other" };
};

/** `@repo/domain-invest/...` → `@repo/domain-invest`, 아니면 null */
const domainPackageOf = (source) => {
  const match = source.match(/^(@repo\/domain-[^/]+)/);
  return match ? match[1] : null;
};

/** 상대 경로가 `packages/domain-<x>` 안을 가리키면 그 패키지 이름 */
const domainPackageOfPath = (resolved) => {
  const match = resolved.match(/(?:^|\/)packages\/(domain-[^/]+)(?:\/|$)/);
  return match ? `@repo/${match[1]}` : null;
};

/**
 * 도메인 축 (`FE-REQ-052` FR-4). 위반이면 `{ rule, message }`.
 *
 * | 어디서 | 무엇을 | 규칙 |
 * |---|---|---|
 * | `packages/domain-A` | `domain-B` | `cross-domain` — 도메인 사이는 URL 링크와 BFF 응답으로만 |
 * | 셸 `apps/web` | `domain-*` | `shell-domain` — 홈은 BFF 카드로만 받는다 |
 * | zone 앱 `apps/web-<x>` | 남의 `domain-*` | `foreign-domain` — zone 은 자기 도메인 패키지만 |
 */
const checkDomainImport = (here, source, resolved) => {
  const target = domainPackageOf(source) || domainPackageOfPath(resolved);
  if (!target) return null;

  if (here.webShared) {
    return {
      rule: "shared-domain",
      message: `'${source}' — \`${WEB_SHARED_PACKAGE}\` 는 shared 레이어다. 도메인 화면 코드를 import 하지 않는다 (\`fsd-shared.md\`, FE-REQ-053).`,
    };
  }
  if (here.domainPackage) {
    if (target === here.domainPackage) return null;
    return {
      rule: "cross-domain",
      message: `'${source}' — \`${here.domainPackage}\` 가 다른 도메인 \`${target}\` 를 import 했다. 도메인 사이는 URL 링크(\`CrossZoneLink\`)와 BFF 응답(서버 계산 값)으로만 잇는다 (ADR-005 §2-3).`,
    };
  }
  if (here.app === zones.SHELL_APP) {
    return {
      rule: "shell-domain",
      message: `'${source}' — 셸(\`apps/${zones.SHELL_APP}\`)은 도메인 화면 코드를 import 하지 않는다. 홈은 BFF \`HomeSummaryCard[]\` 로만 받는다 (ADR-005 §2-2).`,
    };
  }
  if (zones.DOMAIN_ZONE_APPS.includes(here.app)) {
    const own = zones.domainPackageOfApp(here.app);
    if (target === own) return null;
    return {
      rule: "foreign-domain",
      message: `'${source}' — zone \`apps/${here.app}\` 은 자기 도메인 패키지(\`${own}\`)만 소비한다. 다른 도메인은 링크로 넘어간다 (microfrontend.md §7).`,
    };
  }
  return null;
};

/**
 * `@repo/web-shared/<segment>` 를 `@/shared/<segment>` 꼴로 읽는다 — 같은 shared 판정을 태운다 (FE-REQ-053).
 * `layout` 은 shared 세그먼트가 아니라 공용 레이아웃 자리다(`WEB_SHARED_ENTRIES`).
 */
const asLayerAlias = (source) => {
  if (source === WEB_SHARED_PACKAGE) return "@/shared";
  if (source.startsWith(`${WEB_SHARED_PACKAGE}/`)) return `@/shared/${source.slice(WEB_SHARED_PACKAGE.length + 1)}`;
  return source;
};

/** `@/entities/market/model/types` → { layer, slice, deeper } */
const parseAliasImport = (rawSource) => {
  const source = asLayerAlias(rawSource);
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

  // FE-REQ-052 FR-4 — 도메인 축. 상대 경로로 패키지 경계를 넘어도 같은 판정
  const domainViolation = checkDomainImport(here, source, resolved);
  if (domainViolation) return domainViolation;

  // FR-23 · FR-24 — 앱(zone) 경계는 어디서든 넘지 못한다. 상대 경로도 마찬가지다.
  const crossApp = resolved.match(/apps\/([^/]+)\/src/);
  if (crossApp && crossApp[1] !== here.app) {
    // 도메인 패키지가 앱 src 를 찌르는 것도 같은 위반이다(here.app = null)
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

  // FE-REQ-053 — shared 패키지 안에는 레이어 alias 가 없다. `@/…` 는 전부 위 레이어다
  if (here.webShared && source.startsWith("@/")) {
    return {
      rule: "upper-layer",
      message: `'${source}' — \`${WEB_SHARED_PACKAGE}\` 는 shared(0) 레이어다. 앱 alias(\`@/…\`)를 import 하지 않는다. 세그먼트끼리는 상대 경로로 잇는다 (FE-REQ-053).`,
    };
  }

  // FR-22 — 다른 레이어·슬라이스는 반드시 alias 로 참조한다
  if (isRelative) {
    const unit = unitOf(here);
    const padded = `/${resolved}/`;
    if (unit && !padded.includes(`/${unit}/`)) {
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
    const fromWebShared = source.startsWith(`${WEB_SHARED_PACKAGE}/`);
    const entries = fromWebShared ? WEB_SHARED_ENTRIES : SHARED_SEGMENTS;
    if (target.slice && !entries.includes(target.slice)) {
      return {
        rule: "shared-segment",
        message: `'${source}' — \`shared\` 의 세그먼트는 ${entries.join(" · ")} 뿐이다 (\`fsd-shared.md\`).`,
      };
    }
    // 예외: vanilla-extract 토큰. barrel 로 가져오면 `.css.ts` 빌드 그래프에 React 가 들어온다.
    const isStyleModule = /\.css$/.test(source);
    if (target.deeper.length > 0 && !isStyleModule) {
      return {
        rule: "segment-internal",
        message: `'${source}' — 세그먼트 내부 경로를 직접 찌르지 않는다. \`${fromWebShared ? WEB_SHARED_PACKAGE : "@/shared"}/${target.slice}\` 로 들어온다 (FR-4). 예외는 \`*.css\` 토큰 모듈뿐이다.`,
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

/** zone 앱이 가지면 안 되는 레이어 — 화면은 `domain-*` 패키지에 (ADR-005 §2-4) */
const THIN_ZONE_FORBIDDEN_LAYERS = ["entities", "features", "widgets"];

/** 파일이 놓인 자리 자체가 규칙을 어기는지 본다 (레이어 이름·레지스트리·얇은 zone). */
const checkLocation = (filePath) => {
  const here = locate(filePath);
  if (!here || here.area !== "src") return null;

  if (zones.DOMAIN_ZONE_APPS.includes(here.app) && THIN_ZONE_FORBIDDEN_LAYERS.includes(here.layer)) {
    return {
      rule: "thin-zone",
      message: `\`apps/${here.app}/src/${here.layer}\` — zone 앱은 얇다. 라우트 · 레이아웃 · next.config 만 두고 화면은 \`${zones.domainPackageOfApp(here.app)}\` 에 둔다 (FE-REQ-052 FR-4, ADR-005 §2-4).`,
    };
  }

  if (here.unknownLayer) {
    const allowedLayers = here.domainPackage ? DOMAIN_PACKAGE_LAYERS : LAYERS;
    return {
      rule: "unknown-layer",
      message: here.domainPackage
        ? `\`${here.root}/${here.unknownLayer}\` — 도메인 패키지의 레이어는 ${allowedLayers.join(" · ")} 뿐이다. shared 는 \`${WEB_SHARED_PACKAGE}\`, app 은 zone 앱이 갖는다 (FE-REQ-053).`
        : `\`src/${here.unknownLayer}\` — \`src\` 의 최상위는 6레이어(${LAYERS.join(" · ")})뿐이다 (FR-1).`,
    };
  }
  if (!here.layer || here.layer === "shared" || !here.slice) return null;
  if (here.layer === "app") return null;

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
  DOMAIN_PACKAGE_LAYERS,
  THIN_ZONE_FORBIDDEN_LAYERS,
  WEB_SHARED_ENTRIES,
  WEB_SHARED_PACKAGE,
  checkDomainImport,
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
