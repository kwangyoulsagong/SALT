---
id: FE-REQ-052
area: frontend
kind: ARCH
title: "F0 — zone = 도메인: 규칙 개정 · 레지스트리 5 zone · lint 도메인 축 · web-tax 삭제"
priority: high
created: 2026-10-30
source: requirements/decisions/ADR-005-domain-zones.md
---

## Summary

`ADR-005` 를 **실행되는 규칙**으로 만든다. 화면은 아직 옮기지 않는다(그건 `FE-REQ-053`). 아키텍처 변경이라 **단일 커밋**(revert 지점 하나, PR 규칙 §4).

## FR

| FR | 내용 |
|---|---|
| FR-1 | `.claude/rules/microfrontend.md` 개정 — §1 zone = 도메인 · §2 셸 책임 · §3 도메인 격리 · §4 zone 앱은 얇다 · §5 `CrossZoneLink` · §6 `AppChrome` · 동시 배포 · §7 prefix · assetPrefix 유일(`ADR-005` §2). "세 조건" · "탭으로 자르지 않는다" 문장은 지우고 ADR-005 링크. 200줄 이하 |
| FR-2 | `packages/core/src/zones/registry.ts` — zone 5개(`web` · `web-investment` · `web-savings` · `web-household` · `web-tips`) · 포트 3000/3002~3005 · 경로 prefix · assetPrefix. 지금 빠진 셸 경로(`/search` → 투자, `/onboarding` · `/login` → 셸)를 바로잡는다 |
| FR-3 | 셸 `next.config.js` rewrites 를 레지스트리에서 생성(손으로 쓴 `TAX_ZONE_ORIGIN` 제거). 각 zone origin 은 env `ZONE_<NAME>_ORIGIN` |
| FR-4 | `packages/eslint-plugin-fsd/layer-rules.cjs` 에 도메인 축 — `domain-*` ↔ `domain-*` import 금지 · `apps/web` → `domain-*` 금지 · `apps/web-*/src/{entities,features,widgets}` 금지. 쓰기 훅(`layer-check.mjs`)도 같은 표 |
| FR-5 | `packages/eslint-plugin-zone` — 대상 경로를 `/tax` 하드코딩에서 레지스트리 전체로(CommonJS 제약 때문에 레지스트리 JSON 생성본을 읽는다) |
| FR-6 | `apps/web-tax/**` 삭제 · turbo 파이프라인 · 포트 표 · 문서에서 제거. `ADR-002` §5 열린 항목 닫음 |
| FR-7 | 빈 zone 앱 4개 골격(`app/layout.tsx` · `next.config.js`(basePath 없음 · assetPrefix) · `package.json`) — 화면 없음, 셸 rewrites 가 가리킬 수 있게 |
| FR-8 | `salt-microFe/CLAUDE.md` · 루트 `CLAUDE.md` 서피스 표 · `layered-architecture.md` §4 슬라이스 레지스트리에 도메인 패키지 열 |

## Acceptance Criteria

- [x] lint 변이 3종(도메인 간 import · 셸 → 도메인 · zone 앱 안 features) 각각 실패 — 셸 → 도메인 · 남의 도메인 · zone 앱 안 features 는 ESLint stdin 변이로, 도메인 간은 훅 실행 테스트로(`domain-*` 패키지가 아직 없어 그 안의 eslint 설정이 없다 — 판정 함수는 같은 `layer-rules.cjs`). 체크리스트 §2
- [x] 다른 zone 경로에 `next/link` 쓰면 lint 실패 — 셸에서 `/household` · `/tips/abc`, 저축 zone 에서 `/home` 실패 · 셸에서 `/investments` 통과(옮기기 전 `hostedIn`)
- [x] `apps/web-tax` 0 · `TAX_ZONE_ORIGIN` grep 0(코드 · 활성 문서. 지난 REQ · 체크리스트의 기록은 이력이라 둔다)
- [x] 셸 기동 후 `/goals` 등 4 경로가 각 zone(빈 골격)으로 rewrites — `/goals` · `/household` · `/tips` · `/coach` 가 `data-zone` 표지를 단 각 zone 404, 셸 화면(`/investments` · `/investments/BTC` · `/goals/addgoals` · `/home`)은 셸 200
- [x] 규칙 문서 200줄 이하 — `microfrontend.md` 105줄

## 계약 영향

- **`.claude/rules/` 변경**(PR 규칙 §5). RN `RN-REQ-032` 번들 이름

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-02 | **done** — FR-2~8 구현(브랜치 `feat/fe-req-052-domain-zones`). 설계 판단 둘: ① 레지스트리 데이터를 `registry.json` 하나로 두고 TS(`registry.ts`) · CommonJS(`registry.cjs`)가 같이 읽는다 — FR-5 의 "JSON 생성본" 대신 생성 단계 없이 계산 대조 테스트로 갈라짐을 막는다 ② **`hostedIn`** 칸 — 화면은 아직 셸에 있으므로 cross-zone 판정은 "그 화면을 지금 서비스하는 앱" 기준, 셸 rewrites 경로는 `fallback`(셸 라우트가 이긴다 — `afterFiles` 면 동적 라우트 `/investments/[symbol]` 을 가로챈다). 옮기는 REQ(`FE-REQ-053` · `056`)가 `hostedIn` 을 자기 앱으로 바꾼다. zone id 는 `default`/`tax` → `shell` · `invest` · `savings` · `household` · `tips`. 셸 공용 청크 105 → 105 kB |
| 2026-10-30 | **FR-1 먼저 완료** — 사용자 "새로 생긴 아키텍처 규칙 다 싱크": `microfrontend.md` 를 ADR-005 로 개정(세 조건 · 탭 문장 삭제). 코드가 아직 2 zone 이라 §0 "지금 코드 상태" 표를 두고 FR-2~7 이 닫힐 때 행을 지운다. FR-8 일부(`salt-microFe/CLAUDE.md` · 루트 서피스 표 · `layered-architecture.md` 세금 행 · `fsd-pages.md` · `rn-microfrontend.md` 경계 기준). 되돌리기 지점(코드 단일 커밋)은 그대로 |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 공용 레이아웃 폴더 이름 `chrome` → `layout`(`7dbb0c56`) · 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`) · 웹 글꼴 404 → `next/font` 같은 origin · body 기본 글꼴(`9725dd20`). 파일 4개(경로 이동 내용 무변경 0 · 수정 4 · 추가 0 · 삭제 0). 화면 · 동작이 바뀐 몫은 위 커밋 설명대로 |
