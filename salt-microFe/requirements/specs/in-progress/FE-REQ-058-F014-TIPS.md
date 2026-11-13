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
| FR-3 | 로그인 시 "내 숫자로 다시 읽기" 블록(~~서버 렌더~~ **정정 2026-11-05(S2d)** 계산은 서버 · 칸은 로그인한 사람에게만 부르는 클라이언트 잎 — ISR 글 HTML 은 사람마다 같아야 한다, 실패 시 일반 예시) | FR-6 |
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
| FR-3 내 숫자로 | 범위 밖 | ~~S2b~~ **S2d**(서버 FR-6 — 서비스를 넘는다) **정정 2026-11-05(S2d)** 내 숫자 · 고정비 증가(주거) 닫힘(`MONEY-S2d-tips-my-numbers`) — 나머지 트리거는 원천 · 글이 생길 때 |
| FR-4 변경 diff | **done** — "바뀐 것" 이력 목록 + ~~줄 diff 는 S2b~~ **줄 diff(S2b, 아래 표)** | `RevisionList` |
| FR-5 퀴즈 | ~~범위 밖~~ **done(S2b, 아래 표)** | `features/answer-quiz` · `pages/quiz-cards` |
| FR-6 때맞춘 팁 카드 | **done** — `@repo/ui/timely-tip-card` + 칸 연결 `@repo/web-shared/ui` `TimelyTip`(조회 · 닫기 · 그리기) · 저축 `/goals` · 가계부 `/household`. 홈은 홈 카드 묶음 때 | `TimelyTipCard` · `TimelyTip` |
| FR-7 휴대폰 폭 | **done** — 공개 zone 껍데기 `PublicShell`(앱 내비 · 768 미만 안내 · prerender 없음). 360 · 390(웹뷰) · 1280 가로 넘침 0. LCP 는 미측정 | `@repo/web-shared/layout` |
| FR-8 원문 위치 | **done** — 1안(레포 파일, 서버가 주인). 렌더 소스 = BFF 구조 응답(HTML 0) | `SRV-REQ-047` FR-1 |
| 색인 | **done** — 레이아웃 기본 noindex, 페이지가 서버 공개 플래그로 켠다(프론트 상수 0). 글은 목록이 공개 · slug 있을 때만 부른다(Next 데이터 캐시가 404 로 앞선 200 을 안 덮는다 — 실화면) | `publicTipsApi` · `tipsMetadata` |

## 구현 현황 — 금융 팁 S2b(2026-11-05, 루트 `requirements/specs/done/MONEY-S2b-tips-quiz-diff-slice.md`)

| FR | 상태 | 어디 |
|---|---|---|
| FR-4 줄 diff | **done** — 이력 줄 아래 바뀐 줄: `<del>`(취소선 · 2단 회색) / `<ins>`(옅은 면) + 앞 글자 − · + + 읽기 프로그램 문구. 빨강 · 초록 0(오름 · 내림 뜻). 비교는 서버 | `RevisionList` · `tip.css.ts` |
| FR-5 맞히기 | **done** — 글 위(메타 아래 · 본문 위) "읽기 전에 맞혀 보기": 보기 버튼(44 높이) → 서버 채점 → 맞음/정답 · 풀이 · 로그인이면 "카드에 담았어요"(처음 한 번) / "이미 모은 카드예요", 아니면 "로그인하면 … 모을 수 있어요". 다시 풀기. 시간 제한 · 점수 · 연속 0(FEATURE-014 "30초"는 문제 길이 목표 — 재촉하지 않는다). 결과 `role=status` · 정답 · 고른 보기는 글자 표지까지 | `features/answer-quiz` |
| FR-5 카드 모음 | **done** — `/tips/cards`(개인 · 늘 noindex) "N문제 중 M장" · 카드(글 제목 · 문제 · 정답 · 풀이 · 모은 날 · 글 보기 셰브론). 로그아웃 · 실패 · 늦음 · 공개 전 각각 한 줄 | `pages/quiz-cards` · `ROUTES.tipCards` |
| 날짜 | **정정** — 시각(이력 · 모은 날)은 한국 날짜로(UTC 앞 열 글자라 0~9시가 하루 앞) | `formatTipDate` |
| 번들 | 브라우저 요청은 엔티티 배럴 밖(feature · page `api/`) — 배럴에 두니 공개 서버 페이지 `/tips` 가 143 → 147 kB. 옮긴 뒤 144 | `entities/tip/model/queryKeys.ts` |

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — 이 REQ 에 걸린 몫(`FE-REQ-054`) — 금융 팁은 탭이 아니다. 화면이 생기면 zone 레이아웃에 `AppShell` + `VIEW_TRANSITION_CSS`(공개 화면이라 로그아웃이면 내비 · prerender 판단을 다시 본다 — 지금 공개 경로 목록은 `/` · `/login` · `/onboarding`) |
| 2026-11-05 | 금융 팁 S2a — to-do → in-progress. FR-1 · 2 · 6 · 7 · 8 done, FR-4 첫 판, FR-3 · 5 S2b, LCP 미측정. 커밋 `5cc3b415` · `6f9cab4b` · `9e6973ae` · `5915638f` · 슬라이스 `tip` · 페이지 `tips` · `tip-detail` 레지스트리 |
| 2026-11-05 | 금융 팁 S2b — FR-4 줄 diff done · FR-5 맞히기 · 카드 모음 done · 날짜 한국 날짜 정정. FR-3 은 S2d, LCP 는 공개 직전. 커밋 `d59efa9c` · 레지스트리 features `answer-quiz` · pages `quiz-cards` |
| 2026-11-05 | 금융 팁 S2b 확인 2회차 — 결함: 공개 글에서 만료된 세션으로 퀴즈를 풀면 로그인으로 보냈다 → 공개 경로 판정 하나(`isPublicPath`, `/tips` 공개 · `cf93acb1`). 키보드(Tab · Enter · 2px 테두리) · Swagger 경로 8 확인 |
| 2026-11-05 | 금융 팁 S2b 확인 3회차 — 만료 세션 `/tips/cards` 는 로그아웃 안내("불러오지 못했어요" 아님) · `/tips` 에 "맞힌 카드 모음" 줄(모음으로 가는 길이 퀴즈 결과뿐이었다). `fd88af11` |
| 2026-11-05 | 금융 팁 S2d — FR-3 done: `features/read-my-numbers`(지연 로딩 잎 — 글 첫 로드 115 → 121 → 117 kB) · 로그아웃 · 만료 세션 안내 한 줄 · 실패 = 글의 예시 그대로 · 서버 HTML 개인 숫자 0. 커밋 `c7508e54` · 레지스트리 features `read-my-numbers` |
| 2026-11-05 | 금융 팁 S2d 확인 2회차 — 빈 사용자 머리 문구 결함 고침(숫자가 있을 때만) · `test:layer-check` · zone 5 빌드 |
| 2026-11-09 | FE-066 · 067(검색 모달 · 머리 내비 — 커밋 `334084aa`, 루트 `requirements/specs/in-progress/FE-066-067-search-header-slice.md`) — `PublicShell` 주석 — 공개 zone 은 앱 내비 · 검색칸 없음(변화 없음) |
| 2026-11-13 | 서버 S3d 짝(루트 `requirements/specs/done/MONEY-S3d-identity-classify-usage-slice.md`) — `ops/salt.sh` 에 금융 팁 zone `web-tips`(3005)가 **빠져 있었다** — 셸이 `/tips` 를 프록시하는데 아무도 띄우지 않았다(11-13 수동 기동 후 넣음) |
