# F011 슬라이스 5e 체크리스트 — 국내 종목 상태 억제 (2026-10-23)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `FC-REQ-020` FR-9 | 판정 · 게이트 두 열 · 실데이터 `kr_daily`(상태 216종목 · 203행/기간 · 켜진 카드 16 · 14 · 10 · 10 그대로) | `salt-forecast/requirements/reports/checklists/FC-REQ-020.md` §FR-9 |
| `SRV-REQ-040` FR-10 · `SRV-REQ-037` | 정리매매 칸(실파일 3종목) · 사유 4개 통과 · 000650 실 DB 4기간 `investment_warning` | `salt-server/requirements/reports/checklists/SRV-REQ-040.md` §5e |
| `DB-REQ-033` | 컬럼 추가만 · 로컬 적용 | `salt-server/requirements/reports/checklists/DB-REQ-033.md` |
| `FE-REQ-041` · `FE-REQ-038` | 문구 4개 · 실서버 응답 렌더 | `salt-microFe/requirements/reports/checklists/FE-REQ-041.md` §5e |
| 짝 영역 | BFF 변경 없음(`BFF-REQ-040` Changelog) — 실 BFF 경유로 확인 | — |
| 검증 | 예측 ruff · pyright 0 · lint-imports 3/3 · pytest · leakage / 서버 build · lint · 719/719 · prisma generate / 프론트 tsc · eslint | — |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산 0 · 문구에 확신 · 목표가 · 명령형 0 · 소유자 전용 그대로 | — |
| 계약 | DB 컬럼 추가(추가만) · 사유 값 4개 추가(서버 · 화면이 같이 받음). 뷰 컬럼 무변경 | — |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 상시 서버가 새 사유를 그대로 옮기는지 | launchd 서버는 main 코드 — 머지 전엔 "표본이 쌓이는 중"으로 접는다 | 머지 · `launchctl kickstart -k gui/$(id -u)/com.salt.server` 뒤 000650 1회 |
| 07:30 마스터 동기화가 정리매매 칸을 갱신하는지 | 머지 전 서버 코드는 칸을 모른다 | 머지 · 재시작 다음 날 07:30 뒤 `is_liquidation` 수 |
| 상태 종목의 실제 상세 화면 | 상태 종목은 시세 유니버스 밖이라 상세 404 — 실응답을 다른 종목 페이지에 끼워 확인 | 시세 유니버스 종목이 상태를 얻을 때 |
| 장중 상태 변화 | 마스터 하루 1회 | 필요해지면 실시간 상태를 판정에 |
| 폐지 최종 수익률 채점 | 원천 없음 | `FC-REQ-020` FR-8 |
