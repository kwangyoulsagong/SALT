# F009 슬라이스 10 — 매입가 숨김 체크리스트

| 요구 | 구현 | 확인 |
|---|---|---|
| FR-27 토글 · 서버 저장 | `features/toggle-purchase-price` → PATCH `/api/app/ai-coach/profile` | 실스택: 켬 → 새로고침 뒤 켜짐 유지 → 끔 |
| FR-27 손익률 숨김 | `entities/portfolio` `showProfitRate` · `widgets/home-briefing` `InvestmentsSummaryLeaf` | 실스택 홈: −38.16 % · +18.84 % → 없음 → 다시 보임. 평가금액 · 합계 그대로 |
| FR-27 "오늘 처음 본다면" 한 줄 | `PORTFOLIO_MESSAGES.firstLookQuestion` | 숨김일 때만 보임 |
| 깜빡임 없음 · 실패 시 기본 | 설정 오기 전 `"unknown"` → 손익률 안 그림 · 실패면 `"shown"` | 실화면(설정 응답만 늦춤 · 실패시킴): 4초 늦추면 합계는 1초에 보이고 손익률은 끝까지 0건 → 5초에 물음 한 줄. 500 이면(재시도 1회 뒤) 손익률 −37.98 % · +19.17 % 보임 |
| 키보드 | 저장 중 입력 무시 · `aria-busy` | Space 두 번 · 포커스 유지 · `switch` 이름 · 상태 |
| 다른 화면에 남는 손익률 | — | 숨김 켜고 8개 경로(`/home` · `/` · `/investments` · `/investments/BTC` · `ETH` · `/coach/report` · `/goals/addgoals` · `/onboarding`) 화면 글자에서 서버 손익률(±0.6) 0건. 끈 대조에선 `/home` 두 종목만 걸림(감지기 정상). `/coach/report` 의 `+18.6%` 는 백테스트 연수익(무관) |
| 폭 | — | 768: `/home` · `/coach/report` 가로 스크롤 없음. 390 앱 웹뷰(UA `SALTApp/`): 홈 손익률 없음 · 물음 한 줄 · 토글 터치로 끔(PATCH `false`) → 홈 손익률 다시 보임 · 가로 스크롤 없음. 390 일반 브라우저는 768 미만 안내(의도) |
| 공통 수용 기준 | 주문 경로 0 · 금액 계산 0 · 지시 0 | 문구 검토 |

검증 명령 · 결과는 `salt-microFe/requirements/reports/checklists/FE-REQ-039.md` §FR-13.

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실사용자(소유자) 계정 화면 | 소유자 계정 읽기를 이 세션 권한이 막았다 — 우회하지 않음. 임시 사용자로 같은 경로 전부 확인 | `QA-001` 로그인 QA(사용자) |

닫힌 것(2026-10-29 후속, 사용자 "확인 못한거 다확인해"): 평단 · 손익금 화면이 웹에 없다는 전제(8개 경로 대조로 확인 — 숨길 것은 홈 손익률뿐) · 390(앱 웹뷰) · 768 · 설정 지연/실패 분기. 포지션 화면이 생기면 같은 설정을 읽는 것은 미검증이 아니라 그 화면의 요구다.
