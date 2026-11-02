# FE-REQ-052 — zone = 도메인: 규칙 · 레지스트리 5 zone · lint 도메인 축 · web-tax 삭제 — 체크리스트

스펙: `salt-microFe/requirements/specs/done/FE-REQ-052-ARCH-DOMAIN-ZONES.md` · 2026-11-02
브랜치: `feat/fe-req-052-domain-zones` (base `main` `fba1f42a`) · 루트 슬라이스 `requirements/specs/done/MONEY-F0-domain-zones-slice.md`

## 1. FR ↔ 구현

| FR | 구현 | 상태 |
|---|---|---|
| FR-1 규칙 개정 | `.claude/rules/microfrontend.md`(2026-10-30) + §0 을 지금 상태로 다시 씀 · §3 설정 · §4 판정 문장 | ✅ 105줄 |
| FR-2 레지스트리 5 zone | `packages/core/src/zones/registry.json`(데이터) · `registry.ts`(TS) · `registry.cjs`(CommonJS). id `shell` · `invest` · `savings` · `household` · `tips`, 포트 3000 · 3002~3005, assetPrefix 4. 빠졌던 경로 `/search` → 투자, `/login` · `/onboarding` · `/settings` → 셸 | ✅ |
| FR-3 rewrites 생성 | 셸 `next.config.js` → `zoneRewrites(process.env)`. 경로 `fallback` · 자산 `afterFiles`. env `ZONE_<ID>_ORIGIN`. `TAX_ZONE_ORIGIN` 제거 | ✅ |
| FR-4 도메인 축 | `layer-rules.cjs` `checkDomainImport`(`cross-domain` · `shell-domain` · `foreign-domain`) · `checkLocation` `thin-zone`. 훅 `layer-check.mjs` 대상에 `packages/domain-*/src` 추가 | ✅ |
| FR-5 zone lint 레지스트리 전체 | `no-cross-zone-link` 가 파일의 앱(`apps/<app>`)으로 `registry.cjs` 에 묻는다. 앱 eslintrc 의 `zonePaths` 복사 삭제(옵션은 덮어쓰기용으로만 남김) | ✅ |
| FR-6 web-tax 삭제 | `apps/web-tax/**` 삭제 · `pages` 레지스트리 `tax` 삭제 · 문서(README 3 · CLAUDE.md · 규칙 4 · 스킬 2 · pm 지도) · `ADR-002` §3 행 · §5 닫음 | ✅ |
| FR-7 빈 zone 4 | `apps/web-{investment,savings,household,tips}` — `app/layout.tsx`(`data-zone` 표지) · `next.config.js`(assetPrefix = 레지스트리 값, basePath 없음) · `package.json` · `tsconfig.json` · `.eslintrc.json` · README | ✅ |
| FR-8 문서 | `salt-microFe/CLAUDE.md`(앱 · 명령 · 훅 케이스 수) · 루트 `CLAUDE.md` 서피스 행 · `layered-architecture.md` §1 서피스 · §3 금지 표 · §4 도메인 패키지 열 · §8 소비자 | ✅ |

## 2. 검증 (실행한 것만)

| 확인 | 결과 |
|---|---|
| `pnpm lint`(모노레포) | 8/8 성공 — 처음 `@repo/core` 가 `registry.cjs` 경고 3건으로 실패 → 파일 머리 주석으로 고침 |
| `pnpm check-types` | 8/8 |
| `pnpm test` | `@repo/core` 62(새 `registry.test.ts` 7) · `@repo/ui` 43 |
| `pnpm test:layer-check` | 차단 12(레이어 8 + 도메인 4) · 통과 7 |
| `pnpm build` | 5/5 — 도메인 zone 4 각 단독 빌드 · 공용 86 kB |
| 셸 번들(main 워크트리 빌드와 대조) | 공용 105 → **105 kB(0)** · `/search` 16.7 → 17 kB · `/onboarding` 첫 로드 152 → 153 kB · 나머지 0. 레지스트리 JSON 이 `shared/config` 로 들어온 몫 |
| ESLint 변이(stdin, 파일 쓰지 않음) | 셸 `<Link href="/household">` · `"/tips/abc"` 실패 · `"/investments"` 통과 · 셸 `@repo/domain-invest` → `shell-domain` · 저축 zone `<Link href="/home">` 실패 · 저축 zone `@repo/domain-invest` → `foreign-domain` · `apps/web-savings/src/features/**` → `thin-zone` |
| 도메인 간 import | 훅 실행 테스트 9번(`cross-domain`) + 상대 경로 우회(`../../../../../domain-savings/src`)도 `cross-domain` — `domain-*` 패키지가 없어 ESLint 경로는 패키지가 생길 때(같은 `layer-rules.cjs`) |
| 실기동 rewrites | zone 4 dev(3002~3005) + 셸 재기동: `/goals` · `/household` · `/tips` · `/coach` → 각 zone 404(`data-zone` 표지), `/investments` · `/investments/BTC` · `/goals/addgoals` · `/home` → 셸 200, `/tips-static/_next/...` 200. 확인 뒤 zone 4 dev 종료 · 셸 `ops/salt.sh restart web` |
| 훅 사후 실행 | Python 으로 쓴 `apps/web-*/app/layout.tsx` 4개 exit 0 |
| grep | `TAX_ZONE_ORIGIN` · `web-tax` — 코드 0, 활성 문서 0(지난 REQ · 체크리스트 · 회고 · `ADR-001`/`002` 본문 기록은 이력) |

## 3. 짝 영역 — 변경 없음

| 영역 | 왜 안 바뀌나 |
|---|---|
| BFF · 서버 | 요청 경로 · 응답 계약 무변경. 프록시는 프론트 셸 안 |
| `RN-REQ-032`(번들 이름) | 도메인 이름 = 레지스트리 `domain` 값(`invest` · `savings` · `household` · `tips`) — 문서와 같다, 코드 없음 |
| `ops/salt.sh` | 셸(3000)만 띄운다 — 빈 zone 은 서비스할 화면이 없다. 화면이 옮겨질 때 이름 표에 추가(`FE-REQ-053`) |
| `@repo/ui` | 무변경 — Storybook 빌드 대상 아님 |

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `domain-*` 패키지 안 FSD 레이어 축 · ESLint 설정 | 패키지가 아직 없다 — 도메인 축만 검사 | `FE-REQ-053` FR-1 |
| `ops/salt.sh` 에 zone 앱 기동 | 빈 골격이라 띄울 이유가 없다 | `FE-REQ-053`(투자 화면 이동) |
| prerender · 문서 간 전환 · `AppChrome` | 이 REQ 범위 밖 | `FE-REQ-054` · `FE-REQ-055` |
| 운영 경로 라우팅(한 origin L7) | 배포 환경 미착수 | `OPS-001` |
| zone 앱 `next.config.js` 머리 주석의 경로 · assetPrefix 값 | 주석이라 레지스트리를 바꾸면 갈라질 수 있다(설정 값 자체는 레지스트리에서 읽는다) | 레지스트리를 바꾸는 REQ 가 같이 고친다 — 회고 Action |
