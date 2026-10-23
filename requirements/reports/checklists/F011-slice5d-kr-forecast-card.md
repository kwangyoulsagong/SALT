# F011 슬라이스 5d 체크리스트 — 국내 주식 변동 범위 카드 화면 (2026-10-23)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `FE-REQ-041` FR-23 | Playwright 고정 응답 4상태(렌더 · 보유 30주 · 전 기간 `stale_inputs` · 비소유자 404 자리 없음) · 콘솔 오류 0 · axe 새 요소 0 | `salt-microFe/requirements/reports/checklists/FE-REQ-041.md` §슬라이스 5d |
| `FE-REQ-038`(카드 주인) | `assetType` 기본 `crypto` — 코인 분기 무변경 | `salt-microFe/requirements/reports/checklists/FE-REQ-038.md` §슬라이스 5d |
| 짝 영역 | BFF `BFF-REQ-037` · `BFF-REQ-040` 변경 없음 기록 · 서버 변경 없음(5b `GetSymbolForecast`) · 예측 `FC-REQ-020` · `FC-REQ-009` 범위 밖 "국내 카드 화면" 닫힘 | 각 Changelog |
| 모노레포 검증 | `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test`(core 34 · ui 43) · `pnpm test:layer-check`(차단 8 · 통과 5) · `pnpm build`(`web` `/investments/[symbol]` 137 kB 전과 같음 · `web-tax`) · 변경 파일 `layer-check` 훅 사후 실행 차단 0 | — |
| Storybook | `@repo/ui` 변경 없음 | 해당 없음 |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산 0(시나리오 원화는 서버) · 방향 없음(범위만) · 확신 · 목표가 · 명령형 문구 0 · 3종은 BFF 가 막는다 · 소유자 전용 | — |
| 계약 | 서버 · BFF · DB 무변경. FE 내부 prop 추가(선택) | — |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실데이터로 렌더되는 국내 카드 · 실서버 경유 | 서버(4000)가 10-20 뒤 꺼져 국내 일봉이 멈췄다 → 4기간 `stale_inputs`. 서버 · 배치는 이 슬라이스 범위 밖이라 돌리지 않았다 | 서버 재기동 → 일봉 채움 → `kr_daily` 뒤 `/investments/005930` |
| 1024px 이하 한 줄 배치 | 1440 만 찍었다 | 다음 화면 확인 |
| 코인 상세 카드 재촬영 | 코드상 분기 밖이라 다시 찍지 않았다 | 다음 코인 상세 화면 확인 |
| 카드 기존 색 대비 19건 | 코인 · 국내 공통, 기존 색 일괄 치환 금지 | 대비 일괄 결정 때 |
| FR-8 상폐 오프라인 평가 · 라이브 26주 재평가 | 5c 남은 항목 | `FC-REQ-020` FR-8 · 라이브 26주 |
