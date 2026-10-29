# F009 슬라이스 10 — 매입가 숨김 체크리스트

| 요구 | 구현 | 확인 |
|---|---|---|
| FR-27 토글 · 서버 저장 | `features/toggle-purchase-price` → PATCH `/api/app/ai-coach/profile` | 실스택: 켬 → 새로고침 뒤 켜짐 유지 → 끔 |
| FR-27 손익률 숨김 | `entities/portfolio` `showProfitRate` · `widgets/home-briefing` `InvestmentsSummaryLeaf` | 실스택 홈: −38.16 % · +18.84 % → 없음 → 다시 보임. 평가금액 · 합계 그대로 |
| FR-27 "오늘 처음 본다면" 한 줄 | `PORTFOLIO_MESSAGES.firstLookQuestion` | 숨김일 때만 보임 |
| 깜빡임 없음 | 설정 오기 전 `"unknown"` → 손익률 안 그림 | 코드 · 숨김 상태 첫 화면에 손익률 없음 |
| 키보드 | 저장 중 입력 무시 · `aria-busy` | Space 두 번 · 포커스 유지 · `switch` 이름 · 상태 |
| 공통 수용 기준 | 주문 경로 0 · 금액 계산 0 · 지시 0 | 문구 검토 |

검증 명령 · 결과는 `salt-microFe/requirements/reports/checklists/FE-REQ-039.md` §FR-13.

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 평단 · 손익금 숨김 | 웹에 그 화면이 없다 | 포지션 화면(`position-overview`) |
| 390 화면 | 웹 768 미만 안내가 덮는다(의도) | RN(F007) |
| 실사용자 계정 화면 | 소유자 계정 설정을 건드리지 않으려 임시 사용자로 확인 | `QA-001` 로그인 QA |
