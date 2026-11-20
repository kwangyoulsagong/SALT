#!/usr/bin/env node
/**
 * `layer-check` 훅의 위반 케이스 (`FE-REQ-009` 수용 기준 — 위반 8개로 테스트).
 * 도메인 축 4개(`FE-REQ-052` FR-4 — 도메인 간 · 셸 → 도메인 · 남의 도메인 · zone 앱 안 features)를 더했다.
 * 패키지 안 레이어 4개(`FE-REQ-053` — domain-* 안 cross-slice · web-shared 세그먼트 내부 · web-shared → 앱 alias · domain-* 안 shared)를 더했다.
 * 휴대폰 진입점 3개(`FE-REQ-072` — mobile → pages · mobile → mobile · 레지스트리 밖 mobile)를 더했다.
 *
 * 훅을 **실제로 실행**한다. 판정 함수를 부르는 것으로는 훅이 stdin 을 못 읽거나
 * exit code 를 잘못 내는 것을 못 잡는다.
 *
 * ```bash
 * node salt-microFe/.claude/hooks/__tests__/layer-check.test.mjs
 * ```
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(here, "../layer-check.mjs");
const APP = "/repo/salt-microFe/apps/web";

const run = (filePath, content) => {
  const result = spawnSync(process.execPath, [HOOK], {
    encoding: "utf8",
    input: JSON.stringify({
      tool_name: "Write",
      tool_input: { content, file_path: filePath },
    }),
  });
  return { status: result.status, stderr: result.stderr };
};

/** 막아야 하는 8가지. */
const BLOCKED = [
  {
    name: "1. 상위 레이어 import (entities → features)",
    file: `${APP}/src/entities/market/ui/PriceCell.tsx`,
    code: `import { useSignIn } from "@/features/sign-in";`,
    rule: "upper-layer",
  },
  {
    name: "2. cross-slice (entities → 다른 entities)",
    file: `${APP}/src/entities/coach/ui/CoachCard.tsx`,
    code: `import { PriceCell } from "@/entities/market";`,
    rule: "cross-slice",
  },
  {
    name: "3. 슬라이스 내부 경로 직접 참조",
    file: `${APP}/src/widgets/market-board/ui/Board.tsx`,
    code: `import { MarketSort } from "@/entities/market/model/types";`,
    rule: "slice-internal",
  },
  {
    name: "4. shared 세그먼트 내부 경로 직접 참조",
    file: `${APP}/src/entities/market/ui/PriceCell.tsx`,
    code: `import { formatPrice } from "@/shared/lib/formatPrice";`,
    rule: "segment-internal",
  },
  {
    name: "5. zone 교차 (web-investment → web/src)",
    file: "/repo/salt-microFe/apps/web-investment/src/app/styles/globals.css.ts",
    code: `import { Layout } from "../../../../web/src/shared/ui";`,
    rule: "cross-app",
  },
  {
    name: "7. 루트 라우팅 파일에 re-export 외의 import",
    file: `${APP}/app/home/page.tsx`,
    code: `import { GoalSummary } from "@/entities/goal";\nexport default GoalSummary;`,
    rule: "routing-shell",
  },
  {
    name: "8. 레지스트리에 없는 슬라이스 생성",
    file: `${APP}/src/entities/crypto-wallet/model/types.ts`,
    code: `export interface Wallet { id: string }`,
    rule: "registry",
  },
  {
    name: "9. 도메인 간 import (domain-savings → domain-invest)",
    file: "/repo/salt-microFe/packages/domain-savings/src/widgets/goal-board/ui/GoalBoard.tsx",
    code: `import { HoldingRow } from "@repo/domain-invest";`,
    rule: "cross-domain",
  },
  {
    name: "10. 셸 → 도메인 패키지",
    file: `${APP}/src/pages/home/ui/HomePage.tsx`,
    code: `import { InvestmentsPage } from "@repo/domain-invest";`,
    rule: "shell-domain",
  },
  {
    name: "11. zone 앱이 남의 도메인 패키지 (web-tips → domain-household)",
    file: "/repo/salt-microFe/apps/web-tips/app/tips/page.tsx",
    code: `export { HouseholdPage as default } from "@repo/domain-household";`,
    rule: "foreign-domain",
  },
  {
    name: "12. zone 앱 안 features — zone 앱은 얇다",
    file: "/repo/salt-microFe/apps/web-savings/src/features/add-goal/ui/Form.tsx",
    code: `export const Form = () => null;`,
    rule: "thin-zone",
  },
  // FE-REQ-053 — 레이어가 패키지(`domain-*` · `web-shared`) 안에도 있다
  {
    name: "13. 도메인 패키지 안 cross-slice (domain-invest entities/coach → entities/market)",
    file: "/repo/salt-microFe/packages/domain-invest/src/entities/coach/ui/CoachCard.tsx",
    code: `import { PriceCell } from "@/entities/market";`,
    rule: "cross-slice",
  },
  {
    name: "14. @repo/web-shared 세그먼트 내부 경로",
    file: "/repo/salt-microFe/packages/domain-invest/src/entities/market/ui/PriceCell.tsx",
    code: `import { formatPrice } from "@repo/web-shared/lib/formatPrice";`,
    rule: "segment-internal",
  },
  {
    name: "15. web-shared 가 앱 alias(위 레이어) import",
    file: "/repo/salt-microFe/packages/web-shared/src/ui/NavChevron/NavChevron.tsx",
    code: `import { useAuthState } from "@/entities/auth";`,
    rule: "upper-layer",
  },
  {
    name: "16. 도메인 패키지 안 shared 레이어 — shared 는 @repo/web-shared",
    file: "/repo/salt-microFe/packages/domain-invest/src/shared/lib/format.ts",
    code: `export const x = 1;`,
    rule: "unknown-layer",
  },
  // FE-REQ-071 FR-2 — 휴대폰 표면 zone 은 `domain-*/mobile` 진입점만
  {
    name: "17. 휴대폰 zone → 도메인 데스크톱 화면(pages)",
    file: "/repo/salt-microFe/apps/web-mobile/app/m/goals/page.tsx",
    code: `export { GoalsPage as default } from "@repo/domain-savings/pages/goals";`,
    rule: "mobile-domain",
  },
  {
    name: "18. 휴대폰 zone → 도메인 배럴",
    file: "/repo/salt-microFe/apps/web-mobile/app/m/household/page.tsx",
    code: `export { HouseholdPage as default } from "@repo/domain-household";`,
    rule: "mobile-domain",
  },
  {
    name: "19. 휴대폰 zone 안 widgets — zone 앱은 얇다",
    file: "/repo/salt-microFe/apps/web-mobile/src/widgets/tab-bar/ui/TabBar.tsx",
    code: `export const TabBar = () => null;`,
    rule: "thin-zone",
  },
  {
    name: "20. 입구 목록에 없는 layout 안쪽 경로",
    file: `${APP}/src/pages/login/ui/LoginPage.tsx`,
    code: `import { SignInForm } from "@repo/web-shared/layout/SignInForm";`,
    rule: "segment-internal",
  },
  // FE-REQ-072 FR-1 — 도메인 패키지 `mobile` 진입점은 pages 의 형제
  {
    name: "21. 휴대폰 진입점 → 데스크톱 화면(pages)",
    file: "/repo/salt-microFe/packages/domain-savings/src/mobile/goals/ui/GoalsMobile.tsx",
    code: `import { GoalsSide } from "@/pages/goals";`,
    rule: "mobile-pages",
  },
  {
    name: "22. 휴대폰 진입점 → 다른 휴대폰 진입점",
    file: "/repo/salt-microFe/packages/domain-savings/src/mobile/goals/ui/GoalsMobile.tsx",
    code: `import { GoalDetailMobile } from "@/mobile/goal-detail";`,
    rule: "cross-slice",
  },
  {
    name: "23. 레지스트리에 없는 휴대폰 진입점",
    file: "/repo/salt-microFe/packages/domain-household/src/mobile/budget-sheet/ui/Sheet.tsx",
    code: `export const Sheet = () => null;`,
    rule: "registry",
  },
];

/** 통과해야 하는 것 — 규칙이 과하게 막지 않는지 본다. */
const ALLOWED = [
  {
    name: "features → entities barrel",
    file: `${APP}/src/features/add-goal/ui/CategoryPicker.tsx`,
    code: `import { GOAL_CATEGORIES } from "@/entities/goal";`,
  },
  {
    name: "같은 슬라이스 내부는 상대 경로",
    file: `${APP}/src/entities/market/ui/MarketPreview/MarketPreview.tsx`,
    code: `import { PriceCell } from "../PriceCell";`,
  },
  {
    name: "vanilla-extract 토큰은 세그먼트 내부여도 허용",
    file: `${APP}/src/entities/goal/ui/GoalRow.css.ts`,
    code: `import { vars } from "@/shared/ui/tokens.css";`,
  },
  {
    name: "루트 라우팅 파일의 @/pages re-export",
    file: `${APP}/app/home/page.tsx`,
    code: `export { HomePage as default } from "@/pages/home";`,
  },
  {
    name: "zone 앱 라우팅이 자기 도메인 패키지를 re-export",
    file: "/repo/salt-microFe/apps/web-investment/app/investments/page.tsx",
    code: `export { InvestmentsPage as default } from "@repo/domain-invest";`,
  },
  {
    name: "도메인 패키지가 공용 패키지 import",
    file: "/repo/salt-microFe/packages/domain-invest/src/entities/market/ui/PriceCell.tsx",
    code: `import { Button } from "@repo/ui/button";\nimport { ZONES } from "@repo/core/zones";`,
  },
  {
    name: "도메인 패키지 pages → widgets barrel",
    file: "/repo/salt-microFe/packages/domain-invest/src/pages/investments/ui/InvestmentsPage.tsx",
    code: `import { MarketBoard } from "@/widgets/market-board";\nimport { CrossZoneLink } from "@repo/web-shared/ui";`,
  },
  {
    name: "web-shared 토큰 모듈은 세그먼트 내부여도 허용",
    file: "/repo/salt-microFe/packages/domain-invest/src/entities/market/ui/PriceCell.css.ts",
    code: `import { vars } from "@repo/web-shared/ui/tokens.css";`,
  },
  {
    name: "web-shared 서버 페이지 틀 입구(ui/frame)는 허용 — 배럴의 클라이언트 모듈을 끌지 않는다(FE-REQ-060 3단계)",
    file: "/repo/salt-microFe/packages/domain-tips/src/pages/tips/ui/TipsPage.tsx",
    code: `import { PageFrame } from "@repo/web-shared/ui/frame";`,
  },
  {
    name: "web-shared 세그먼트끼리 상대 경로",
    file: "/repo/salt-microFe/packages/web-shared/src/ui/CrossZoneLink/CrossZoneLink.tsx",
    code: `import { isCrossZonePath } from "../../config";`,
  },
  {
    name: "휴대폰 zone 이 도메인 패키지의 mobile 진입점을 re-export(넷 모두)",
    file: "/repo/salt-microFe/apps/web-mobile/app/m/goals/page.tsx",
    code: `export { GoalsMobile as default } from "@repo/domain-savings/mobile/goals";\nexport { InvestMobile } from "@repo/domain-invest/mobile";`,
  },
  {
    name: "휴대폰 zone 라우트가 공용 레이아웃(로그인 · 틀)을 re-export",
    file: "/repo/salt-microFe/apps/web-mobile/app/m/login/page.tsx",
    code: `export { MobileLoginPage as default } from "@repo/web-shared/layout";`,
  },
  {
    name: "배럴 밖 입구 layout/sign-in — 셸 feature 가 공용 로그인 폼을(FE-REQ-071 FR-6)",
    file: `${APP}/src/features/sign-in/ui/SignInForm.tsx`,
    code: `import { SignInForm } from "@repo/web-shared/layout/sign-in";`,
  },
  {
    name: "휴대폰 진입점 → entities · features · widgets 배럴(FE-REQ-072 FR-1)",
    file: "/repo/salt-microFe/packages/domain-invest/src/mobile/investment-detail/ui/DetailMobile.tsx",
    code: `import { useMarketTicker } from "@/entities/market";\nimport { CheckTradeOdds } from "@/features/check-trade-odds";\nimport { ScenarioPanel } from "@/widgets/scenario-panel";\nimport { MobileSummary } from "@repo/web-shared/layout/mobile";`,
  },
  {
    name: "검사 대상이 아닌 파일",
    file: "/repo/bff/src/routes/home.ts",
    code: `import { anything } from "@/widgets/whatever";`,
  },
];

let failed = 0;

for (const testCase of BLOCKED) {
  const { status, stderr } = run(testCase.file, testCase.code);
  const ok = status === 2 && stderr.includes(`[${testCase.rule}]`);
  if (!ok) {
    failed += 1;
    console.error(`✗ ${testCase.name}`);
    console.error(`   exit=${status} rule='${testCase.rule}' 기대와 다르다`);
    console.error(`   stderr: ${stderr.trim() || "(없음)"}`);
  } else {
    console.log(`✓ 차단 — ${testCase.name}`);
  }
}

for (const testCase of ALLOWED) {
  const { status, stderr } = run(testCase.file, testCase.code);
  if (status !== 0) {
    failed += 1;
    console.error(`✗ 통과해야 하는데 막혔다 — ${testCase.name}`);
    console.error(`   stderr: ${stderr.trim()}`);
  } else {
    console.log(`✓ 통과 — ${testCase.name}`);
  }
}

if (failed > 0) {
  console.error(`\n실패 ${failed}건`);
  process.exit(1);
}
console.log(`\n전부 통과 (차단 ${BLOCKED.length} · 통과 ${ALLOWED.length})`);
