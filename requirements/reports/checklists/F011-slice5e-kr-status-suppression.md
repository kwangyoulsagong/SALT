# F011 슬라이스 5e 체크리스트 — 국내 종목 상태 억제 (2026-10-23)

색인이다 — 세부는 영역 체크리스트에 있다.

| 항목 | 결과 | 근거 |
|---|---|---|
| `FC-REQ-020` FR-9 | 판정 · 게이트 두 열 · 실데이터 `kr_daily`(상태 216종목 · 203행/기간 · 켜진 카드 16 · 14 · 10 · 10 그대로) | `salt-forecast/requirements/reports/checklists/FC-REQ-020.md` §FR-9 |
| `SRV-REQ-040` FR-10 · `SRV-REQ-037` | 정리매매 칸(실파일 3종목) · 사유 4개 통과 · 000650 실 DB 4기간 `investment_warning` | `salt-server/requirements/reports/checklists/SRV-REQ-040.md` §5e |
| `DB-REQ-033` | 컬럼 추가만 · 로컬 적용 | `salt-server/requirements/reports/checklists/DB-REQ-033.md` |
| `FE-REQ-041` · `FE-REQ-038` | 문구 4개 · 실서버 응답 렌더 | `salt-microFe/requirements/reports/checklists/FE-REQ-041.md` §5e |
| 짝 영역 | BFF 변경 없음(`BFF-REQ-040` Changelog) — 실 BFF 경유로 확인 | — |
| 검증 | 예측 ruff · format · pyright 0 · lint-imports 3/3 · pytest · leakage · `kr_daily` · `kr_backtest` `--dry-run --as-of 2026-06-30` main 워크트리와 같음(리포트 바이트 동일 37,900 B) / 서버 build · lint · 719/719 · `test:layer-check`(차단 10 · 통과 6) · prisma generate / BFF build · 251/251 / 프론트 `pnpm check-types` 5/5 · `pnpm lint` 5/5 · `pnpm test`(core 34 · ui 43) · `pnpm test:layer-check`(차단 8 · 통과 5) · `pnpm build`(web `/investments/[symbol]` 137 kB 그대로 · web-tax) / 바뀐 TS 7파일 layer-check 훅 두 개 사후 실행 차단 0 | — |
| 재현 결함(수정) | 첫 판이 과거 `--as-of` 에도 오늘 상태를 걸었다 → 마스터 `synced_at` 을 available_at 으로(`status_known_at`) | `FC-REQ-020` 체크리스트 |
| 공통 수용 기준(§6) | 주문 경로 0 · 금액 계산 0 · 문구에 확신 · 목표가 · 명령형 0 · 소유자 전용 그대로 | — |
| 계약 | DB 컬럼 추가(추가만) · 사유 값 4개 추가(서버 · 화면이 같이 받음). 뷰 컬럼 무변경 | — |

## 운영 — 재시작에서 찾은 서버 결함(2026-10-23)

| 항목 | 결과 |
|---|---|
| 증상 | kickstart(13:22) 뒤 프로세스 · 워커는 도는데 4000 LISTEN 없음 · 헬스 000 · 로그는 "Server is running" |
| 원인 | Express 5 `listen` 콜백이 `EADDRINUSE` 를 인자로 준다(재현 스크립트) — `server.ts` 가 무시. 이전 프로세스가 아직 포트를 쥔 순간 새 프로세스가 떴다 |
| 수정 | `acb66bf` 실패면 로그 + exit(1) → launchd 30초 뒤 재기동. 4000 35초 점유 상태 kickstart → 실패 2회 → 13:28:42 기동 · LISTEN · 200 |
| 사고 | 확인 중 `PORT=5173 tsx src/server.ts` 를 실수로 띄워 **워커 포함 중복 서버가 약 2분**(13:25:23~) 돌았다 — 부팅 작업(마스터 · 달력 · 시세) 1회 중복, 전부 upsert 라 데이터 영향 없음 · KIS 한도 잠깐 공유. 곧바로 종료 |
| KIS 실시간 | 13:22 재시작 직후 `OPSP8996 ALREADY IN USE appkey` 43회(이전 세션 잔존) → 13:28:50 재접속 뒤 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~상시 서버가 새 사유를 그대로 옮기는지~~ | **닫힘 2026-10-23 13:29** — launchd 는 작업 트리 `src` 를 tsx 로 돌린다(지금 이 브랜치 = 머지 뒤 코드). kickstart 뒤 4000 HTTP: 000650 4기간 `investment_warning` · 003670 4기간 렌더 · BTC 1 · 2주 렌더(3 · 4주 `miscalibrated`, 그대로) · 토큰 없음 401 | 닫힘 |
| 마스터 동기화가 정리매매 칸을 갱신하는지 | **서버 프로세스 경로는 닫힘** — 부팅 실행이 07:30 cron 과 같은 `syncMaster` 를 부른다: 13:22 · 13:28 두 번 `synced_at` 갱신 · `is_liquidation` 3. 실제 07:30 회차(cron `30 7 * * *`, 등록 로그 "국내 주식 워커 등록 (10)")는 시간이 지나야 본다 | 2026-10-24 07:30 뒤 `synced_at` · 정리매매 수 |
| 상태 종목의 실제 상세 화면 | 상태 종목은 시세 유니버스 밖이라 상세 404 — 실응답을 다른 종목 페이지에 끼워 확인 | 시세 유니버스 종목이 상태를 얻을 때 |
| 장중 상태 변화 | 마스터 하루 1회 | 필요해지면 실시간 상태를 판정에 |
| 폐지 최종 수익률 채점 | 원천 없음 | `FC-REQ-020` FR-8 |

- 2026-10-29 전수 조사: **done 으로 이동** — 머지 · FR 완료, 남은 항목은 장기 라이브 관찰 · 다른 REQ · QA · 사용자 결정으로 넘긴 것뿐(영역 REQ 체크리스트가 추적)
