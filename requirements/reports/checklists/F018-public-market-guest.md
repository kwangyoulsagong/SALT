# F018 루트 체크리스트 — 로그인 없이 시세 보기

## 영역

| 영역 | REQ | 체크리스트 | 결과 |
|---|---|---|---|
| 서버 | `SRV-REQ-056` | `salt-server/requirements/reports/checklists/SRV-REQ-056.md` | build · lint 0 · test 1080 · 실호출 경계 |
| BFF | `BFF-REQ-055` | `bff/requirements/reports/checklists/BFF-REQ-055.md` | build 0 · test 441 · WS 실측 |
| FE | `FE-REQ-070` | `salt-microFe/requirements/reports/checklists/FE-REQ-070.md` | types · lint 13/13 · test 358 · zone 빌드 · storybook · 실화면 |
| 서버 DB(504) | `DB-REQ-017` | 5회차 절 | 코인 최대 7.6s → 128ms |
| 예측 | `FC-REQ-018` | 스펙 Changelog · 테스트 둘 | ruff · pyright · lint-imports · pytest · leakage |
| DB · RN | 없음 | — | 토큰 상태 0 · 앱 웹뷰는 늘 로그인(390 UA 확인) |

## 기획 수용 기준(`FEATURE-018`)

| 기준 | 결과 |
|---|---|
| 쿠키 0 새 브라우저로 국내 표 · 상세 · `/search` — 로그인 화면 0 · 실시간 · 호가 · 본문 | 실화면 통과(실시간은 node WS — 3010 origin 이 허용 목록 밖) |
| ★ · 판단 · 거래 · 해설 유리막 · 응답에 사람 · AI 값 0 | 통과 — 검색 `isTracked` null · 사람 경로 401 |
| 게스트 토큰으로 사람 경로 표본 전부 401 | 9곳 401(Kotlin 저축 포함) |
| 30분 지난 탭 이어 보기 | 규칙 표 테스트(401 → 게스트 → 재시도) — 실제 30분 대기는 하지 않음, 만료 게스트 401 은 서버 경계 표 |
| 로그인 비소유자 — 국내 · 판단 보임 · 전망 없음 | 통과(시험 신원 · 임시 사용자) |
| 저장소 · 응답 · 로그에 KIS 키 · 게스트 토큰 값 0 | 쿠키 httpOnly · 로그 형식(경로 · 상태만) |
| 마스터 인덱스 §6 | 주문 경로 0 · 금액 서버 · 3종 게이트 · 확신 표현 0 — 변경 없음 |

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 게스트 발급 클라이언트 IP 상한 | `X-Forwarded-For` 사슬 없음 — 지금은 서버 전체 상한 | 배포 라우팅(`OPS-001`) |
| 국내 판단 상세 장중 최대 4s | 매달린 예측 뉴스 작업(옛 코드)이 트랜잭션을 쥐어 VACUUM 이 죽은 행을 못 지움 — 프로세스 종료가 이 세션에서 권한 거절 | 사용자가 그 작업을 끝낸 뒤 `VACUUM (ANALYZE) price_history` + 재측정(`DB-REQ-017` 5회차) |
