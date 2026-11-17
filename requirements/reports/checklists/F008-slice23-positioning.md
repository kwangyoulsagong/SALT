# F008 슬라이스 23 — 쏠림 신호 — 체크리스트 (2026-09-27)

영역: `salt-forecast/requirements/reports/checklists/FC-REQ-007.md` · `salt-server/requirements/reports/checklists/DB-REQ-029.md` §2026-09-27 · `salt-server/requirements/reports/checklists/SRV-REQ-037.md` §슬라이스 23 · `bff/requirements/reports/checklists/BFF-REQ-037.md` §슬라이스 23 · `salt-microFe/requirements/reports/checklists/FE-REQ-038.md` §슬라이스 23

| 확인 | 결과 |
|---|---|
| 예측 | `ruff` · `pyright` 0 · `lint-imports` 3 kept · `pytest` 전체(+10) · `tests/leakage`(미래 오염 — 봉 · 정산 · 환율을 as_of 뒤에서 3배로 바꿔도 같음) · 스키마 계약(DB) · 드라이런 `--as-of` 2026-06-30 · 2025-01-15 · 실행 5초 · 멱등(8,668 → 8,668) |
| DB | `migrate deploy` 추가만 · 뷰 둘 Index Scan 0.028 · 0.034ms |
| 서버 | `npm test` 495 / 0(+8) · `tsc` · `lint` · 실 DB 유스케이스(BTC · AAVE) |
| BFF | `npm test` 174 / 0(+7) · `npm run build` |
| 프론트 | `pnpm check-types` · `pnpm lint` · `pnpm test` · `layer-check` 사후 8파일 · 워크트리 빌드 `web`(`/investments/[symbol]` 115 kB, 전과 같음) · `web-tax`(102 kB) |
| 화면 | Playwright 고정 응답(실 DB 에서 서버 유스케이스가 만든 값) — BTC 1280 · AAVE 390 |
| 공통 수용 기준 | 주문 경로 0 · 원화 금액 0(미결제약정은 거래소 USD) · 프론트 계산은 표기뿐 · 확신 · 명령형 · 목표가 · "과열" · 매매 신호 문구 0 · 판정 색 0 · 반응 3종 게이트(표본 · 분포와 평소 · 빗나간 때) · 소유자 전용 · LLM 호출 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실 토큰으로 서버 → BFF → 화면 | 떠 있는 서버 · BFF 가 이 브랜치 코드가 아니고 로컬 토큰 발급을 못 한다 | 머지 뒤 재기동 · `QA-001` 로그인 QA(사용자) · **2026-11-17 `QA-001` →** HTTP 200 · 서버와 같은 값 — 화면 칸은 `be959e5f`(F017 v4 순서 6)에서 은퇴해 화면 확인 대상 없음 |
| 200% 확대 · 대비 측정 | 1280 · 390 두 폭 스크린샷만 | `QA-001` 로그인 QA 때 같이 · **2026-11-17 `QA-001` →** Q-4 — 색맹(deuteranopia) 7화면: 오름 · 내림이 부호 · 글자로도 갈림 · 앱 웹뷰 375 · 360 넘침 0(국내 머리 지표 어긋남은 고침, `FE-REQ-041`) · 200%: 1920 화면(960px) 7화면 정상, 1280 · 1440 화면(640 · 720px)은 768 미만 안내(`FE-REQ-043`)로 바뀜 → **결정 대기**(사용자) · 대비(axe): 기존 토큰 회색 3.03 등 미달 기록, 새 요소 0 — 규칙대로 그대로 |
| 매일 배치로 한 번 돈 결과 | 이번엔 손으로 돌렸다. `daily.sh` 에 단계만 넣었다 | 다음 날 `forecast.job_run` 에 `signals` 행 |
| `v_signal_reaction` 1년 누적 뒤 속도 | as_of 가 하루 12행씩 쌓인다 — 지금 0.034ms | 2027-09 · 보존 정책과 같이 |
| 미결제약정 백분위 · 급변 | 이력 30일 | 2027-09 |
| 다중 비교 보정 | 2,688 조합 조합별 게이트 | CPCV · DSR 슬라이스(P2) |
