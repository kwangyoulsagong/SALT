# FE-REQ-041 체크리스트 — 국내 주식 화면(자산군 탭) (2026-10-08)

실측 환경: 서버 4100(`tsx`) · BFF REST 4101 · WS 4102 · web dev 3100(기존 4001/4002 · 3000 프로세스와 겹치지 않게). 정규장 09:17~09:40 KST.
Playwright(시스템 Chrome) 1440×900, 토큰은 서버 `JWT_SECRET` 으로 만든 소유자 · 비소유자 JWT.

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `widgets/market-board/ui/MarketBoard.tsx` · `KrStockAvailability.tsx` · `model/tabs.ts` | 소유자 탭 `[코인, 국내 주식, 실시간 차트, 관심 종목]` · 비로그인 · 비소유자 `[실시간 차트, 관심 종목]`(전과 같음) |
| FR-2 | `RealtimeMarketTable.tsx` · `entities/market/api/useBoardOverview.ts` · `lib/krOverviewItem.ts` | 국내 주식 50행 · 5열 · hover → 우측 미리보기 · 행 클릭 → `/investments/005930` |
| FR-3 | `api/endpoints.ts` `krOverview` | `1주일` 필터 — 서버 `periodChange`(SK하이닉스 −2.08% · 실시간 +0.81%). 삼성전자 −0.37% 는 5거래일 전(9/30) 종가 = 어제 종가 268,500 이라 같은 값(DB 대조) |
| FR-4 | `entities/market/ui/KrStock/KrSessionLine.tsx` | 정규장 "정규장 · 실시간" 관찰 · 그 밖 상태는 고정 응답으로 확인(아래 "상태 화면") |
| FR-5 | `KrQuoteBadges.tsx` | 라이브 정규장 상위 50 엔 배지 대상 없음 → 고정 응답으로 전 배지 확인(아래) |
| FR-6 | `MarketPreview.tsx` · `MarketPreviewChart.tsx` · `MarketPreviewHeader.tsx` | 국내 주식 5분봉 30봉 미리보기(어제 13:15~ · 오늘 09:25~) · 심리 자리 한 줄 · 이니셜 아이콘 |
| FR-7 | `widgets/coach-panel/ui/CoachPanel.tsx` | 국내 주식 행 → "아직 코치 판단 대상이 아니에요", 코인 판단 조회 0 |
| FR-8 | `WatchlistTab.tsx` · `WatchlistTable.tsx` | 별 → `POST {"assetType":"kr_stock","symbol":"005930","name":"삼성전자"}` → 관심 종목 탭 1행 → 제거 `DELETE` → 0행 · 코인 관심 2행 그대로(DB 원상) |
| FR-9 | `shared/api/websocket/*` · `lib/useKrStockRealtime.ts` | 프레임 `{"type":"subscribe","assetType":"kr_stock","symbols":[50개],"token":"***"}` · 4초에 국내 주식 메시지 234건 · 가격 칸 갱신 |
| FR-10 · 11 | `pages/investment-detail/ui/KrStockDetail.tsx` · `KrStockDetailBody.tsx` · `lib/seo.ts` | 제목 `국내 주식 005930 \| SALT` · `robots: noindex, nofollow` · 시가 269,500 · 고가 270,000 · 저가 266,500 · 호가 단위 500원 · 일봉 "수정주가 기준" · 5분봉 탭 |
| FR-12 | `api/useKrStockQueries.ts` | 비소유자 장 상태 404 한 번 뒤 주기 조회 멈춤(재시도 없음) |
| FR-13 | `features/toggle-watchlist/ui/WatchlistStarButton.tsx` | 수정 전: 별 클릭 뒤 URL 이 상세로 바뀌어 탭이 사라짐 · 수정 뒤: `/investments` 유지 |
| FR-14 | 서버 `krStockLogoUrl` · `packages/ui/src/AssetIcon/AssetIcon.tsx` · 표 · 미리보기 · 상세 · `WatchlistTable` | 유니버스 51종목 FMP 주소 HEAD 51/51 = 200 · 화면 로고 표시 · 404 주소(고정 응답) → 이니셜 · Storybook `BrokenImageFallback` |
| FR-15 | `RealtimeMarketTable.tsx`(`headerLineFit`) · `KrQuoteBadges.tsx` · `krStock.css.ts` | 아래 "상태 화면" — 1440 표 830 = 칸 830(수정 전 거래대금 열 잘림) |

## validate

- `pnpm check-types` · `pnpm lint` · `pnpm test`(core 34 — `krStock.test.ts` 6 포함 · ui 43) · `pnpm test:layer-check`(차단 8 · 통과 5) · 변경 · 신규 파일 전부 `layer-check` 훅 사후 실행 — 차단 0
- 빌드: `web`(`/investments` 153 → 153 kB · `/investments/[symbol]` 135 → 136 kB, 기준 커밋 `78edaf3` 워크트리 빌드 대조) · `web-tax` 102 kB
- 후속(`09659d7` 뒤): `/investments` 153 kB 그대로 · 상세 136 → 137 kB(`AssetIcon` 이 `"use client"`) · `web-tax` 102 kB · `@repo/ui` `build-storybook` 통과 · 서버 648/648 · BFF 243/243 · core 34 · ui 43 · check-types · lint 통과
- 공통 수용 기준(§6): 주문 경로 0 · 금액 계산 0(표시 형식만) · 추천 · 전망 없음 · 확신 문구 0 · 소유자 전용 유지
- BFF 워커가 업비트에 구독하는 관심 심볼은 서버 `distinctSymbols("crypto")` — 국내 주식 6자리 코드가 업비트로 가지 않는다(코드 확인)

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `unavailable`(서버 5xx) 화면 · 실제 장 마감 뒤 라이브 화면 | 고정 응답으로 장 마감 · 휴장 · 지연 · 키 없음 · 배지는 확인했다. 5xx 는 문구 경로만(코인과 같은 "불러오지 못했습니다") | 오늘 15:30 뒤 사용자 눈 확인 |
| 768px 미만 | 웹은 768 미만 전 페이지 안내(`FE-REQ-043`) — 표 접힘을 따로 보지 않았다 | RN 화면(F007) |
| 국내 주식 미리보기 봉 실시간 병합 | BFF 는 체결만 중계 — 봉은 서버 5분 집계라 5분 뒤 다시 받는다 | 봉 WS 가 필요해지면(슬라이스 6) |
| 오늘 일봉 종가 268,000 ≠ 현재가 | 서버 기존 동작(09:10 당일 봉 관측 값) — 화면 문제 아님 | 서버 15:45 확정 회차가 덮는다(`SRV-REQ-040` FR-20) |
| 흐린 로고 7종목(LG전자 · LS ELECTRIC · 삼성전기 · 삼성물산 · 삼성SDI · 삼성SDS · 현대모비스) | logo.dev 원본이 작다 — 서버 판정(`SRV-REQ-040` FR-32)으로 이니셜. FMP 는 엉뚱한 이미지로 제외. 도메인 조회(DART)는 사용자가 하지 않기로 | 사용자가 `DART_API_KEY` 를 넣을 때(코드 준비됨) |
| 800px 표 가로 스크롤 | 2열 배치 기존 동작 — 코인 표도 같다(표 870 · 칸 368) | 같은 화면 원칙 — 바꾸면 두 자산군 같이 |
| 상세 지표 15칸 줄바꿈 정렬 | 줄 첫 칸에도 세로선이 남는다(기존 `stat` 스타일이 칸 수가 적을 때 기준) | 상세를 `symbol-analysis` 와 맞출 때 |
| 거래 기록 `kr_stock` | 서버 포트폴리오 평가가 `MarketAsset` 가격만 본다 | 슬라이스 3b |
| 체결 → 화면 반영 < 1s 수치 | 갱신은 관찰했지만 지연을 재지 않았다 | 3b 실측 |

## 추가 — 깜빡임 빈도(2026-10-08)

| 측정(Playwright 시스템 Chrome · 6초 · 행마다 깜빡임 클래스 유지 시간) | 국내 주식 | 코인 |
|---|---|---|
| 수정 전 | 9번 · 중앙값 23ms | 43번 · 42ms |
| 프레임마다 1종목 | 34번 · 23ms | 51번 · 49ms |
| 50ms 간격(채택) | 38번 · 34ms | 31번 · 50ms |

원인: `blinkingSymbol` 하나 + BFF 500ms 묶음. 코인 표 구조(변경 금지)는 바꾸지 않고 국내 주식 훅이 묶음을 흘린다(`useKrOverviewRealtime`). 사람 눈 확인은 사용자 몫으로 남김.

## 추가 — 상태 화면(고정 응답, 2026-10-08)

Playwright 시스템 Chrome · `page.route` 로 `/api/app/market/kr/{session,overview,:code,:code/chart}` 고정(현재 21:00 KST 가정) · 1440 · 800 · pageerror 0.

| 상태 | 표 머리 장 상태 줄 · 화면 |
|---|---|
| 장 마감 | "정규장 아님 · 장 마감 · 마지막 체결 15:30 · 다음 개장 내일 09:00" |
| 휴장 + 달력 모름 | "정규장 아님 · 휴장일 · 마지막 체결 15:30 · 다음 개장 월요일 09:00 · 개장일은 평일 기준 추정" |
| KIS 지연 | 위 + "시세 제공 지연 중 · 20:40부터" |
| 키 없음(`disabled`) | 자산군 탭 없음 — `[실시간 차트, 관심 종목]` |
| 배지 | `상`(상한가) · 거래정지 · 관리종목 · 투자경고 · "7분 전 시세" · 고가/저가 없음 "—" · 로고 404 → 이니셜 |
| 상세 거래정지 | "거래정지 · 마지막 체결 10/8 15:30" · 배지 · 시가/고가/저가 |

찾고 고친 것(`09659d7`): 첫 열 넓힘 → 거래대금 열 잘림 · 밤에도 "1분" 배지 · 표 머리 지연 줄 누락 · 장 상태 줄 대비 3.03.

## 추가 — axe(wcag2a · 2aa, serious · critical)

| 화면 | 결과 | 판정 |
|---|---|---|
| 국내 주식 탭 | color-contrast 29노드 — 필터 탭 비활성 4.18 · 표 머리 3.03 · 등락 색 3.63/4.27 · 탭 글자 3.03 · 리포트 링크 3.03(전부 기존) + 새 tertiary 한 줄 2(미리보기 "심리 · 스마트 머니 없음" · 코치 자리 국내 주식 줄 — 기존 같은 자리 문구와 같은 색) | 설계 결정 — 유지(기존 색은 사용자와 정한 값, 일괄 치환하지 않는다). 새 장 상태 줄만 3.03 → neutral 700 |
| 상세 | 21노드 — 재사용한 `SymbolHeader` 스타일(돌아가기 링크 · 코드 글자) | 설계 결정 — 유지(코인 상세와 같은 스타일) |

## 추가 — 로고 품질(2026-10-08)

| 단계 | 결과 |
|---|---|
| logo.dev 키 적용 · 128px | 51/51 응답. 레티나 캡처로 표 아이콘 선명 확인 |
| 흐린 원본 | 선명도 0.27~0.44 의 7종목(LG전자 · LS ELECTRIC · 삼성전기 · 삼성물산 · 삼성SDI · 삼성SDS · 현대모비스) → 서버 판정 `none` → 이니셜. 눈으로 고른 7과 같다 |
| DART 도메인 조회 | 하지 않음(사용자 결정). LG전자는 `lg.com` 조회로 선명한 로고가 있다는 것만 확인 |
