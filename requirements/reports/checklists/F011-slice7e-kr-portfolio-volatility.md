# F011 슬라이스 7e 체크리스트 — 보유 합산 변동성 (2026-10-26)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `SRV-REQ-040` FR-46 | `portfolioVolatility` · risk-budget 게이지. 테스트 772/772 · build · lint 0 · Swagger | `salt-server/requirements/reports/checklists/SRV-REQ-040.md` §슬라이스 7e |
| `BFF-REQ-040` FR-25 | 통과 · 두 끝 규칙. 테스트 263/263 · build 0 | `bff/requirements/reports/checklists/BFF-REQ-040.md` §7d 후속 · 7e |
| `FE-REQ-041` FR-29 | "보유 전체 흔들림(연) 47% ~ 58%" 줄 Playwright · 모노레포 검증 · 번들 130 kB 그대로 | `salt-microFe/requirements/reports/checklists/FE-REQ-041.md` §7d 후속 · 7e |
| 실 DB | 최근 250거래일 BTC/삼성 47 ~ 58% · 상관 0.24 등 세 조합 + 코인만 | 서버 체크리스트 |
| 실경로 | 상시 서버 4000 소유자 risk-budget 200 · 5ms(보유 0원 → `insufficient_data`) | 서버 체크리스트 |
| 주인 REQ | `SRV-REQ-038` · `BFF-REQ-038` · `FE-REQ-039` · `FE-REQ-040` Changelog | 각 REQ |
| 공통 수용 기준(§6) | 계산은 서버 · 판정 · 지시 · 확신 표현 0(범위 + "정해져 있지 않아요") · 주문 경로 0 | — |
| 계약 | risk-budget 응답 필드 추가만. DDL · `.claude/rules` 무변경 | — |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실보유로 본 게이지 | 소유자 보유 평가금 0원 | 보유 기록 뒤 1회 |
| 코인 15:30 KST 가격 | 시간봉 보관 없음 — 09:00 KST as-of(6.5시간 근사) | 코인 시간봉을 보관할 때 |
| 위기 시 상관 상승 | 근거 미확보 — 최근 250일 평균 상관만 | 국면별 상관을 잴 때 |
| 섹터 · 베타 중복 별도 표시 | 공분산에 반영되지만 따로 말하지 않는다 | 사용자 요청 시 |
| 1024 · 800 폭 · axe | 1280 한 폭 · 기존 `GaugeItem` 재사용 | 다음 리스크 예산 화면 작업 |
| 상시 서버가 브랜치 코드 | launchd 가 작업 트리를 돈다 | 머지(같은 코드) |
