# FE-REQ-074 체크리스트 — 휴대폰 탭 · 상세 안쪽을 홈 수준으로

확인: 2026-11-20 `feat/fe-req-074-mobile-tab-interiors` · zone 넷 운영 빌드(`ops/salt.sh web prod web-savings web-household web-investment web-mobile`) · 셸 `127.0.0.1:3100` ·
설치 Chrome(Playwright `iPhone 13` 390 · `Galaxy S9+` 360 — 휴대폰 브라우저 UA) · 임시 계정(초대 코드 → `qa074m-…`, 목표 2 · 넣기 2 · 지출 4 · 관심 종목 2 — 끝나고 지움).

## FR

| FR | 구현 위치 | 결과 |
|---|---|---|
| FR-1 탭 요약 = 금액 카드 | `web-shared/src/layout/mobile/MobileSummary.tsx` `icon` · `MobileSummary.css.ts` · `GoalsMobile` `ranking` · `HouseholdMobile` `household` | [x] 아이콘 판 44 + 금액 22 Bold + "모은 돈 · 목표 2개" · 나머지 칸 바닥 줄. 요약 실패면 주인공 없음 → 줄만(기존 분기 그대로) |
| FR-2 목록 판 44 · 모서리 12 | `entities/goal/ui/goalRow.css.ts` `plate` · `entities/household/ui/board.css.ts` 지출 행 판(둘 다 `ON_MOBILE` 안) | [x] 종목 로고는 원 그대로 |
| FR-3 낱말 단위 줄바꿈 | `goalRow.css.ts` `caption` · `MobileSummary` · `MobileShortcuts` · `MobileFoot` `keep-all` | [x] "계획대로면 / 2027년 6월" — 전엔 "2027 / 년 6월" |
| FR-4 투자 탭 | `layout/mobile/MobileShortcuts.tsx`(홈에서 꺼냄 — 홈 · 투자 한 벌) · `DesktopViewFoot.tsx` · `MobileFoot.css.ts`(홈 설정 알약도 이 부품) | [x] |
| FR-5 로고 대체 글자 | `@repo/ui` `assetIcon/assetInitials.ts` + 시험 12건 | [x] 국내 `005930` + 이름 → "삼"(전엔 "00") · 마켓 접두어 떼기(`KRW-BTC` → "BT")는 방어 — 실제 관심 목록 코인 심볼은 `BTC` 라 "KR" 은 1회차 시험 데이터 탓이었다 |
| FR-6 종목 상세 머리 | `mobile/investment-detail/ui/DetailMobileHead.tsx` · `detailMobile.css.ts` | [x] 이름 22 · 로고 32(대체 글자 13) / 가격 30 / "전일 대비 −7.01%"(국내) · "전일 대비 −0.53%"(코인 `BTC` 실화면) |
| FR-7 상세 패널 = 흰 섹션 | `web-shared/src/ui/surface.css.ts` `MOBILE_ROOT` `panel` · `panelTitle` · `panelDescription` | [x] 모서리 0 · 선 0 · 24 × 20 · 제목 22. 데스크톱 1280 리포트 패널 모서리 16 그대로(실측) |
| FR-8 리포트 머리 겹침 0 | `widgets/coach-console/ui/CoachReport.tsx` `reportBack` · `CoachReport.css.ts` | [x] "‹ 투자" · 위젯 제목 숨김(데스크톱은 보임 — 실측) · 면책 띠 흐름 배치 |

## 측정(390 · 360 × 탭 넷 · 달력 · 목표 상세 · 종목 상세 국내 · 코인 · 리포트 = 9화면, 글자 ×1 · ×2)

| 항목 | 결과 |
|---|---|
| 가로 넘침 | 0 / 36 |
| 페이지 오류 | 0(두 기기) |
| 글자 13 미만 | 0 — 1회차에 상세 머리 대체 글자 10px(`AssetIcon sm`) 한 곳 → `md` 로 고침 |
| 누름 44 미만 | 남은 것은 오탐 · 기존: ① 23px 입력 = 닫힌 `<details>` 안(저축 도구 · 리포트 내 기준 — 누름 칸은 바깥 52), ② 한 장 패널 출처 칩 20px = 문장 안 링크(기존 · 이번에 안 건드린 위젯 — 아래 범위 밖) |
| 글자 ×2 잘림 | 남은 것은 화면 낭독용 숨김 글자(1px 클립 span)뿐 |
| 데스크톱 대조 | 바뀐 공용 파일 중 데스크톱 값이 움직이는 곳은 `AssetIcon` 대체 글자 하나(의도). 나머지는 `/m` 표지 안. 1280 리포트 실측 — 뒤로 보임 · 패널 모서리 16 |

## 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm check-types` | 14/14 |
| `pnpm lint` | 14/14(1회차 안 쓰는 import 경고 → 고침) |
| `pnpm test` | 7/7 — 1회차 `fontSizeBudget` 실패(`MOBILE_ROOT` 를 휴대폰 표지로 안 셈) → 시험이 두 표지를 같이 세게 고침 |
| `pnpm test:layer-check` | 차단 22 · 통과 15 |
| `@repo/ui` `build-storybook` | 통과 |
| zone 운영 빌드 | web-savings · web-household · web-investment · web-mobile 통과 · 기동 |
| `node scripts/check-done.mjs` | 통과(커밋 전 마지막) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실기기 손가락 누름 · 등장 | Playwright 는 `:active` 를 흉내만 | `QA-001` Q-8(사용자 휴대폰) |
| ~~한 장 패널 안 출처 칩 20px~~ | **정정** — 휴대폰에서 이미 투명 `::after` 로 누름 칸 44(`FE-REQ-072`). 측정 스크립트가 보이는 상자만 쟀다 | 닫힘(오탐) |
| ~~코인 관심 종목 등락 없음~~ | **정정** — 1회차 시험 데이터를 `KRW-BTC` 로 잘못 넣어 난 것. `BTC` 로 넣으면 등락이 온다(검증 2회차) | 닫힘 |
| 데스크톱 · 서버의 "24시간" 이름표(기존) | 코인 상세 "24시간 등락 · 24시간 범위" · 검색 설명 문구 · 서버 시장 요약 `window: "24h"` 가 업비트 **전일 종가 대비 등락 · 당일 고저**를 "24시간"이라 부른다(거래대금만 진짜 24시간). 서버 계약 이름까지 걸려 이 REQ(휴대폰 FE)에서 고치지 않았다 | 사용자 결정 뒤 별도 REQ(서버 `changeBasis` · 화면 이름표 한 번에) |

## 검증 2회차(2026-11-20 — 사용자 "파이프라인 검증 버그 검증")

| 확인 | 결과 |
|---|---|
| 레이어 훅 사후 실행(Bash 로 쓴 파일 26) | 막힘 0 |
| 정적 규칙(브라우저 API · 도메인 교차 import · zone 넘는 `<Link>` · 새 `next/dynamic`) | 0 |
| zone 여섯 운영 빌드(셸 · 팁 포함) | 통과 · 기동 |
| **버그 ① 등락 이름표** | "오늘" · "24시간"(제가 붙인 것) → "전일 대비" — 업비트 `signed_change_rate` 는 전일 종가 대비 |
| **버그 ② 뼈대 높이** | 저축 요약 뼈대 96 → 214(실측) |
| **버그 ③ 상세 머리 등장 애니메이션** | `MobileSummary` 에 붙인 등장이 목표 상세 머리에도 — 끔(`animation-name: none` 실측) · 탭 요약은 유지 |
| **버그 ④ 출처 칩 넘침** | 320 × 글자 2배 코인 상세 4px → `/m` 칩 폭 = 줄 폭 · 줄바꿈 |
| 정정 | 1회차 코인 상세 · 관심 종목 등락 · "KR" 은 시험 데이터 심볼(`KRW-BTC`) 잘못 — `BTC` 로 다시 잼 |
| 다시 잰 측정 | 390 · 320(Galaxy S9+) × 9화면 × 글자 ×1 · ×2 = 36: 넘침 0 · 페이지 오류 0 · 13 미만 0. 남은 플래그는 오탐(닫힌 `<details>` 입력 · 낭독용 숨김 글자 · `::after` 44 칩) |
| `check-types` · `lint` · `test` | 14 · 14 · 7 통과 |

- 2026-11-20 걸침(`FE-REQ-076` 1단계): 공용 `surface.css` 패널을 카드 판 안에서도 덮음(`/m` 값은 그대로) — 390 대조 변화 0 — 검증은 `checklists/FE-REQ-076.md`
