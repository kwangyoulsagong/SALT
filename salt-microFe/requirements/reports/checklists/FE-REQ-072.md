# FE-REQ-072 체크리스트 — 휴대폰 화면 옮기기 · 앱 웹뷰 계약 걷기

2026-11-20 `feat/fe-req-072-mobile-screens` · zone 여섯 운영 빌드(`ops/salt.sh web prod` — `ZONE_STATIC=per-zone`) · 셸 `127.0.0.1:3100` · 설치 Chrome(Playwright `iPhone 13` 390 · `Galaxy S9+` 360 — **휴대폰 브라우저 UA**, 웹뷰 UA 아님) · 임시 계정(초대 코드 → `qa072m-…`, 목표 2 · 넣기 · 지출 · 매달 나가는 돈 · 보유 1 — 끝나고 지움).

## FR

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 진입점 | 충족 | 레이어 `mobile`(`layer-rules.cjs` — 높이 = pages, `mobile-pages` 차단, 레지스트리 여섯) · 훅 시험 차단 22 · 통과 15(휴대폰 → pages · 다른 mobile · 레지스트리 밖 차단, entities · features · widgets 통과) · `/m` 한 빌드 `@/…` 폴백 — `tsc` · `next build` 둘 다 통과, `mobileAlias.test.ts`(레이어별 슬라이스 이름 겹침 0 · paths 차례) · 홈 = `layout/mobile/home`(BFF `GET /api/app/home` · `onboarding` 서버 조회) |
| FR-2 홈 · 저축 · 가계부 | 충족 | `/m/home` 배너 · 카드 행 3 · 최근 · 다가오는 일(카드 → `/m/household` — `toMobileHref`) · `/m/goals` 요약 1,000,000원(30) · 목표 행 → `/m/goals/<id>` push · 저축 도구 접힘 · `/m/goals/<id>` 하단 "넣기" → 시트 `POST deposits` 201 → 450,000 → 500,000원(시트는 "기록했어요" 결과로 남음 — 옛 웹뷰와 같다) · 뒤로 → `/m/goals` · `/m/household` 세그먼트 넷 `?view=` · 하단 "지출 적기" → 시트 3,200원 `POST expenses` 201 → 455,600 → 458,800원 · 시트 뒤로 = 닫힘 · 주소 그대로 · 하단 버튼 아래 776 < 탭 위 788(탭을 덮지 않음) |
| FR-3 투자 | 충족 | `/m/investments` 리포트 행 · 관심 종목(빈 상태 한 줄) · `/m/investments/BTC` · `/005930` 머리(이름 · 가격 30 · 등락 부호+색) + 한 장 패널 한 열 · `/m/coach/report` 탭 "투자" 불 · 스트림 복귀는 위젯 `useExplanationStream`(코드 변화 0) |
| FR-4 걷기 | 충족 | `grep -r "IN_APP_WEBVIEW\|SALTApp\|data-embed"` 코드 · 규칙 0(남은 곳: 2026-10-30 아키텍처 기록 HTML · REQ 기록 문서) · 데스크톱 zone 다섯 `<head>` 웹뷰 스크립트 · `suppressHydrationWarning` 0 · `appType` 은 휴대폰 표면 · `ON_MOBILE` 파일에서만(`fontSizeBudget.test.ts`) · **데스크톱 `pages` 의 휴대폰 표지 0 시험**(새로) |
| FR-5 실측 | 충족 | 아래 표 |
| 이동 대응표 | 충족 | 휴대폰 UA 문서 이동 `/home` · `/goals` · `/household` · `/investments/BTC` · `/coach/report` → 302 `/m/…` · `/goals/new` · `/household/budget` · `/coach/chat` 200(안내) · 데스크톱 UA `/goals` 200 · `redirect.test.ts` 38(`except` · `toMobileHref` 경계 · 대응표 `to` 는 전부 휴대폰 화면 주소) |
| 탭 이동 | 충족 | 홈 → 저축 → 가계부 → 투자 → 홈 같은 문서(`window` 표지 유지) |

### FR-5 — 390 · 360, 11화면

`/m/home` · `/m/goals` · `/m/goals/<id>` · `/m/household`(목록 · 달력 · 분류 · 봉투) · `/m/investments` · `/m/investments/BTC` · `/m/investments/005930` · `/m/coach/report`

| 값 | 1회차 | 고친 뒤 |
|---|---|---|
| 가로 넘침 | 0 | 0 |
| 글자 13 미만(보이는 글, `role=img` 이니셜 · 가린 글 제외) | 상세 3 · 국내 3 · 리포트 122 | 0 |
| 누름 칸 44 미만 | 달력 1 · 상세 11 · 국내 10 · 리포트 10 | 0(출처 칩은 문장 안이라 투명 `::after` 44 — 상자는 그대로) |
| 글자 ×2 잘림 | 달력 금액 6 · 리포트 종목 이름 6 | 0(줄바꿈) — 남은 것은 스크린리더 전용 글(`srOnly`, 결함 아님) |
| 페이지 오류 · 5xx | 0 | 0 |

고친 자리: 디자인 시스템 크기 표지 넷(`Badge` `data-badge` · `Button` `data-button-size` · `Text` `data-text` · `DisclosureSlot` `data-disclosure-item`)을 휴대폰 틀이 한 번에(배지 sm 11 → 13 · 버튼 44 · 본문 12 → 13) · 투자 `TradeRisk` · `Mirror` · `CoachBlock` · `SignalEvidence` · `CoachReport`(widget) · `RiskBudgetForm` · `ScenarioPanel` 출처 칩 · `CoachDetail` 이름 · `surface.css` 뒤로 · 저축 `itemUnit` · `emergency` 라벨 · 가계부 달력 금액.

## 상태 · 실패

| 항목 | 결과 | 근거 |
|---|---|---|
| 조회 실패 | 충족 | 접근 쿠키만 지워 서버 첫 숫자를 비우고 `route` 503 → `/m/goals` "목표를 불러오지 못했어요" · `/m/household` "가계부를 불러오지 못했어요" + 다시 불러오기 → 길을 열면 465,200원 |
| 지연 청크 실패 | 충족(고침) | 한 장 패널 청크 2개 abort(서비스 워커 막은 새 맥락) — 1회차: 머리(이름 · 가격)까지 "종목 상세를 불러오지 못했습니다" → 패널만 `BlockBoundary` 로 갈라 머리 · 데스크톱 링크 · 탭은 남고 패널 칸만 한 줄 · 페이지 오류 0 |
| 콘솔 | 충족(고침) | `/m/home` 피드 행 키 겹침(같은 날 같은 목표에 두 번 넣기) → 자리 번호로 |

## 데스크톱 배치 변화 0

main(별도 `git worktree` 운영 빌드 — 셸 3200 · 투자 3212 · 저축 3213 · 가계부 3214) vs 브랜치(3100), 1280 · 데스크톱 UA, 같은 계정. 보이는 상자마다 위치 · 크기 · 글자 크기 · 바탕 · 글을 차례로 비교.

| 화면 | 상자 | 다른 줄 |
|---|---|---|
| `/home` · `/goals` · `/goals/<id>` · `?view=history` · `/household` · `?view=calendar` · `/household/budget` · `/coach/report` · `/portfolio` · `/settings` | 같음 | 0 |
| `/investments/BTC` | 569 → 569 | 8 — 전부 실시간 가격 글(83,680,000 → 83,675,000 …). 1회차 높이 차 12px 은 다시 재니 없음(로딩 시점) |
| `/investments/005930` | 583 → 583 | 1 — 가격 글 폭 |

## 번들

| 항목 | 값 |
|---|---|
| 데스크톱 첫 로드 JS(gzip, main 13:51 빌드 → 브랜치) | 37쪽 중 감소 22 · 같음(±0.1) 13 · 늘어남 2 — `/goals` 161.8 → 160.1 · `/goals/[id]` 160.2 → 159.0 · `/household` 178.6 → 177.0 · `/home` 164.5 → 163.7 · `/coach/report` 167.7 → 166.1 · `/investments/[symbol]` 156.9 → 155.5 kB(웹뷰 CSS · 훅 · 시트 · 시작하기 카드가 빠짐). `/search` 167.5 → 169.6(+2.1) · 투자 404 102.9 → 103.1 — 이 REQ 가 그 화면 코드를 고치지 않았다(청크 나눔 차이로 보임, 원인 미확인) |
| `/m` 첫 로드(Next 표) | `/m/home` 107 · `/m/goals` 169 · `/m/goals/[id]` 170 · `/m/household` 173 · `/m/investments` 163 · `/m/investments/[symbol]` 166 · `/m/coach/report` 147 kB |

## 명령

| 명령 | 결과 |
|---|---|
| `pnpm check-types` | 14/14 |
| `pnpm lint` | 14/14 |
| `pnpm test` | core 358 · ui 87 · web-shared 10 · 도메인 셋 36 · 셸 10 |
| `pnpm test:layer-check` | 차단 22 · 통과 15 |
| zone 여섯 운영 빌드 | 통과(`ops/salt.sh web prod`) |
| `@repo/ui` `build-storybook` | 통과(크기 표지 넷 — 배지 · 버튼 · 글 · 고지 칸) |
| `node scripts/check-done.mjs` | 통과(커밋 전 마지막) |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실기기 iOS Safari · Android Chrome(설치 앱 standalone · 기기 글자 크기 실제 설정) | 이 맥에 휴대폰이 없다 — 글자 ×2 는 계산 스타일 두 배로 흉내 | `QA-001` Q-8(사용자) |
| 관심 종목 있는 `/m/investments` 행 | 임시 계정에 관심 종목을 넣지 않았다 — 빈 상태 한 줄만 봤다. 행은 데스크톱 사이드와 같은 조회 · 같은 필드 | 사용자 계정 실기기 때 |
| 지난 달 · 예산 · 반복 · 챌린지 · 목표 만들기의 `/m` 화면 | FR 범위 밖 — 대응표에 없어 휴대폰은 "데스크톱으로 이동해 주세요" · `/m` 화면 안 링크는 "데스크톱 화면으로 보기" | 사용자가 정하면 새 REQ |
| 오프라인 마지막 화면 · 설치 안내 | 순서 3 | `FE-REQ-073` |
| `/search` +2.1 kB 원인 | 이 REQ 코드 변화 0 · 예산(40) 안 | 다음 번들 측정 때 |

## 2026-11-20 `FE-REQ-074` 걸침

- [x] 탭 · 상세 안쪽을 홈 수준으로 — 요약 금액 카드(`MobileSummary icon`) · 목록 판 44 · 투자 탭 바로가기 카드 · 상세 머리 · 리포트 흰 섹션 — 확인은 `checklists/FE-REQ-074.md`(390 · 360 측정 · 1280 데스크톱 대조)

- 2026-11-20 걸침(`FE-REQ-076` 1단계): 가계부 · 저축 요약에 `icon` 을 넘기는 데스크톱 화면만 바뀜 — `/m` 배치 변화 0(390 대조) — 검증은 `checklists/FE-REQ-076.md`
