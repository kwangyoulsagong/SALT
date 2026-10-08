# FE-REQ-041 체크리스트 — 국내 주식 화면(자산군 탭) (2026-10-08)

실측 환경: 서버 4100(`tsx`) · BFF REST 4101 · WS 4102 · web dev 3100(기존 4001/4002 · 3000 프로세스와 겹치지 않게). 정규장 09:17~09:40 KST.
Playwright(시스템 Chrome) 1440×900, 토큰은 서버 `JWT_SECRET` 으로 만든 소유자 · 비소유자 JWT.

| FR | 위치 | 결과 |
|---|---|---|
| FR-1 | `widgets/market-board/ui/MarketBoard.tsx` · `KrStockAvailability.tsx` · `model/tabs.ts` | 소유자 탭 `[코인, 국내 주식, 실시간 차트, 관심 종목]` · 비로그인 · 비소유자 `[실시간 차트, 관심 종목]`(전과 같음) |
| FR-2 | `RealtimeMarketTable.tsx` · `entities/market/api/useBoardOverview.ts` · `lib/krOverviewItem.ts` | 국내 주식 50행 · 5열 · hover → 우측 미리보기 · 행 클릭 → `/investments/005930` |
| FR-3 | `api/endpoints.ts` `krOverview` | `1주일` 필터 — 서버 `periodChange`(SK하이닉스 −2.08% · 실시간 +0.81%). 삼성전자 −0.37% 는 5거래일 전(9/30) 종가 = 어제 종가 268,500 이라 같은 값(DB 대조) |
| FR-4 | `entities/market/ui/KrStock/KrSessionLine.tsx` | 정규장 "정규장 · 실시간" 관찰. 그 밖 상태는 미검증(아래) |
| FR-5 | `KrQuoteBadges.tsx` | 정규장 상위 50 에 배지 대상 없음 — 화면 관찰 0. 타입 · 분기만 |
| FR-6 | `MarketPreview.tsx` · `MarketPreviewChart.tsx` · `MarketPreviewHeader.tsx` | 국내 주식 5분봉 30봉 미리보기(어제 13:15~ · 오늘 09:25~) · 심리 자리 한 줄 · 이니셜 아이콘 |
| FR-7 | `widgets/coach-panel/ui/CoachPanel.tsx` | 국내 주식 행 → "아직 코치 판단 대상이 아니에요", 코인 판단 조회 0 |
| FR-8 | `WatchlistTab.tsx` · `WatchlistTable.tsx` | 별 → `POST {"assetType":"kr_stock","symbol":"005930","name":"삼성전자"}` → 관심 종목 탭 1행 → 제거 `DELETE` → 0행 · 코인 관심 2행 그대로(DB 원상) |
| FR-9 | `shared/api/websocket/*` · `lib/useKrStockRealtime.ts` | 프레임 `{"type":"subscribe","assetType":"kr_stock","symbols":[50개],"token":"***"}` · 4초에 국내 주식 메시지 234건 · 가격 칸 갱신 |
| FR-10 · 11 | `pages/investment-detail/ui/KrStockDetail.tsx` · `KrStockDetailBody.tsx` · `lib/seo.ts` | 제목 `국내 주식 005930 \| SALT` · `robots: noindex, nofollow` · 시가 269,500 · 고가 270,000 · 저가 266,500 · 호가 단위 500원 · 일봉 "수정주가 기준" · 5분봉 탭 |
| FR-12 | `api/useKrStockQueries.ts` | 비소유자 장 상태 404 한 번 뒤 주기 조회 멈춤(재시도 없음) |
| FR-13 | `features/toggle-watchlist/ui/WatchlistStarButton.tsx` | 수정 전: 별 클릭 뒤 URL 이 상세로 바뀌어 탭이 사라짐 · 수정 뒤: `/investments` 유지 |

## validate

- `pnpm check-types` · `pnpm lint` · `pnpm test`(core 34 — `krStock.test.ts` 6 포함 · ui 43) · `pnpm test:layer-check`(차단 8 · 통과 5) · 변경 · 신규 파일 전부 `layer-check` 훅 사후 실행 — 차단 0
- 빌드: `web`(`/investments` 153 → 153 kB · `/investments/[symbol]` 135 → 136 kB, 기준 커밋 `78edaf3` 워크트리 빌드 대조) · `web-tax` 102 kB
- 공통 수용 기준(§6): 주문 경로 0 · 금액 계산 0(표시 형식만) · 추천 · 전망 없음 · 확신 문구 0 · 소유자 전용 유지
- BFF 워커가 업비트에 구독하는 관심 심볼은 서버 `distinctSymbols("crypto")` — 국내 주식 6자리 코드가 업비트로 가지 않는다(코드 확인)

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 장 마감 뒤 · 휴장 · 거래정지 · `stale` · `disabled` · `unavailable` 화면 | 오늘 실측은 정규장뿐. 배지 대상 종목도 없었다 | 오늘 15:30 뒤 실제 화면 확인 또는 Playwright `route` 고정 응답 6상태(F011 검증 계획) |
| 768px 미만 | 웹은 768 미만 전 페이지 안내(`FE-REQ-043`) — 표 접힘을 따로 보지 않았다 | RN 화면(F007) |
| axe | 돌리지 않았다 | 다음 FE 슬라이스(3b) 검증 때 같이 |
| 국내 주식 미리보기 봉 실시간 병합 | BFF 는 체결만 중계 — 봉은 서버 5분 집계라 5분 뒤 다시 받는다 | 봉 WS 가 필요해지면(슬라이스 6) |
| 오늘 일봉 종가 268,000 ≠ 현재가 | 서버 기존 동작(09:10 당일 봉 관측 값) — 화면 문제 아님 | 서버 15:45 확정 회차가 덮는다(`SRV-REQ-040` FR-20) |
| 종목 로고 | KIS 는 주지 않는다. 조사: 조건이 가장 분명한 유료/무료 로고 API 1순위 · 키 없는 공개 이미지 15/15 2순위 · 증권 · 포털 앱 이미지 서버는 사용 금지 | 사용자 결정(키 발급 여부) → 서버 `logoUrl` |
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
