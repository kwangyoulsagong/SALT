---
id: FE-REQ-058
feature: F014
area: frontend
kind: UI
title: "F5 — 금융 팁 zone(apps/web-tips + domain-tips): 공개 · ISR · 휴대폰 폭 · 때맞춘 팁 카드"
priority: medium
created: 2026-10-30
source: pm/requirements/specs/in-progress/FEATURE-014-money-tips.md
---

## Summary

유일한 공개 zone. 검색으로 들어오므로 **휴대폰 폭 레이아웃이 필수**다 — 768 미만 안내(`FE-REQ-043`)에서 뺀다. **법무 확인 전 robots 차단 · 공개 플래그 꺼짐**.

## FR

| FR | 내용 | FEATURE-014 |
|---|---|---|
| FR-1 | `/tips` 목록 · `/tips/[slug]` — 서버 컴포넌트 · ISR. 메타(출처 · 작성일 · 검수일 · 기준 연도 · 유효기한) 항상 표시 | FR-1 |
| FR-2 | `needs_check` 글 — "확인 필요" 띠 · `noindex` | FR-2 |
| FR-3 | 로그인 시 "내 숫자로 다시 읽기" 블록(서버 렌더, 실패 시 일반 예시) | FR-6 |
| FR-4 | 제도 변경 diff 뷰 | FR-7 |
| FR-5 | 30초 맞히기 · 맞힌 카드 모음 | FR-8 |
| FR-6 | `@repo/ui` 때맞춘 팁 카드 — 각 도메인 zone 이 쓰는 공용 컴포넌트(닫기 · 공식 링크) | FR-4 |
| FR-7 | 휴대폰 폭 레이아웃 · LCP 2.5s(모바일 측정) · 768 미만 안내 제외 목록에 `web-tips` | NFR |
| FR-8 | 원문 위치 결정(MDX vs DB) 뒤 렌더 소스 — 1안 MDX | Open Question |

## Acceptance Criteria

- [x] 메타 하나 없는 글이 빌드에서 실패 — 원문은 서버 소유라 서버 빌드(`./gradlew check` `CatalogSpec`)가 실패한다
- [ ] 360px 폭 레이아웃 깨짐 0 · LCP 측정 기록 — **깨짐 0 확인**(360 · 390 · 1280 `scrollWidth - innerWidth` = 0), LCP 는 운영 빌드 측정 전(체크리스트 미검증 표)
- [x] 공개 페이지에 사용자 데이터 0 — 토큰 없는 fetch · BFF 가 서버 필드만
- [x] 법무 확인 전 robots `noindex` 전역 — 레이아웃 기본 noindex · 플래그 꺼짐 실화면 `noindex, nofollow` · 글 404

## 계약 영향

- BFF `BFF-REQ-049`

## 구현 현황 — 금융 팁 S2a(2026-11-05)

| FR | 상태 | 어디 |
|---|---|---|
| FR-1 목록 · 글 | **done** — 서버 컴포넌트 · ISR 60초 · 메타 다섯 칸 항상(출처 · 기준 연도 · 작성일 · 검수일 · 유효기한) | `packages/domain-tips`(`entities/tip` · `pages/tips` · `pages/tip-detail`) · `apps/web-tips/app/tips/**` |
| FR-2 확인 필요 | **done** — 띠(경고 + 제목 글자) · 글 `noindex` · 목록 배지 | `NeedsCheckBand` · `tipMetadata` |
| FR-3 내 숫자로 | 범위 밖 | S2b |
| FR-4 변경 diff | **done(첫 판)** — "바뀐 것" 이력 목록. 줄 diff 는 S2b | `RevisionList` |
| FR-5 퀴즈 | 범위 밖 | S2b |
| FR-6 때맞춘 팁 카드 | **done** — `@repo/ui/timely-tip-card` + 칸 연결 `@repo/web-shared/ui` `TimelyTip`(조회 · 닫기 · 그리기) · 저축 `/goals` · 가계부 `/household`. 홈은 홈 카드 묶음 때 | `TimelyTipCard` · `TimelyTip` |
| FR-7 휴대폰 폭 | **done** — 공개 zone 껍데기 `PublicShell`(앱 내비 · 768 미만 안내 · prerender 없음). 360 · 390(웹뷰) · 1280 가로 넘침 0. LCP 는 미측정 | `@repo/web-shared/layout` |
| FR-8 원문 위치 | **done** — 1안(레포 파일, 서버가 주인). 렌더 소스 = BFF 구조 응답(HTML 0) | `SRV-REQ-047` FR-1 |
| 색인 | **done** — 레이아웃 기본 noindex, 페이지가 서버 공개 플래그로 켠다(프론트 상수 0). 글은 목록이 공개 · slug 있을 때만 부른다(Next 데이터 캐시가 404 로 앞선 200 을 안 덮는다 — 실화면) | `publicTipsApi` · `tipsMetadata` |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 이 REQ 에 걸린 몫(`FE-REQ-054`) — 금융 팁은 탭이 아니다. 화면이 생기면 zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS`(공개 화면이라 로그아웃이면 내비 · prerender 판단을 다시 본다 — 지금 공개 경로 목록은 `/` · `/login` · `/onboarding`) |
| 2026-11-05 | 금융 팁 S2a — to-do → in-progress. FR-1 · 2 · 6 · 7 · 8 done, FR-4 첫 판, FR-3 · 5 S2b, LCP 미측정. 커밋 `5cc3b415` · `6f9cab4b` · `9e6973ae` · `5915638f` · 슬라이스 `tip` · 페이지 `tips` · `tip-detail` 레지스트리 |
