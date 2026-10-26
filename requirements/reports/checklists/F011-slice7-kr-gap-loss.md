# F011 슬라이스 7 체크리스트 — 국내 주식 갭 손실 (2026-10-26)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `SRV-REQ-040` FR-45 | `krGapScenarios` · `overnightGapStats`(인덱스 · 5.1ms) · size-check `gapScenarios`. 테스트 733/733 · build · lint 0 | `salt-server/requirements/reports/checklists/SRV-REQ-040.md` §슬라이스 7 |
| `BFF-REQ-040` FR-20 | 뷰모델 통과 · 묶음 검사. 테스트 252/252 · build 0 | `bff/requirements/reports/checklists/BFF-REQ-040.md` §슬라이스 7 |
| `FE-REQ-041` FR-24 | 거래 폼 세 줄 · 고지. check-types · lint 0 · core 34 · ui 43 | `salt-microFe/requirements/reports/checklists/FE-REQ-041.md` §슬라이스 7 |
| 실경로 | 브랜치 서버 4100(워커 없음) → BFF 4101 → web 3100, 소유자 1440: 005930 손절 −102,185 · 하한가 −371,875 · 하위 1% −147,017(−5.0%, 최악 −10.9%, 1,220거래일). BTC 무변경. 확인 뒤 세 프로세스 종료 | 영역 체크리스트 |
| 주인 REQ | `SRV-REQ-038` · `BFF-REQ-038` · `FE-REQ-039` Changelog | 각 REQ |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산은 서버 · 지시 · 확신 표현 0(조건문 + 숫자) · 소유자 전용 그대로(국내 시세 경로) | — |
| 계약 | size-check 응답 필드 추가(서버 · BFF · `@repo/core`) · `market` 공개 API 추가. DDL · `.claude/rules` 무변경 | — |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 상시 서버(4000) 경유 응답 | launchd 서버는 작업 트리를 돌린다 — 머지 · 재시작 전엔 main 코드 | 머지 뒤 kickstart · size-check 국내 1회 |
| 하위 1% 갭이 앞으로의 갭을 덮는가 | 과거 5년 분포라 2026 같은 고변동 해가 오면 더 깊을 수 있다 — 그래서 "최악" 대신 분위 · 최악 관측 · 기간을 같이 적는다 | 판단 없음(표시 문구로 대신함) |
| 정리매매 · 거래정지 재개일 갭 | 원천 끊김 경계(0.69~1.31)가 함께 뺀다 — 그 위험은 하한가 줄과 "연속 하한가에는 끝이 없다" 문구가 말한다 | 상태 이력 원천이 생기면(`FC-REQ-020` FR-9 와 같은 제약) |
| FR-43 · 44 · 46 · 47 | 사용자가 이번 슬라이스로 FR-45 만 골랐다 | 슬라이스 7 다음 브랜치 |
| 1024 · 800 폭 · axe | 1440 한 폭 · 기존 스타일 재사용 | 다음 거래 폼 화면 작업 |
