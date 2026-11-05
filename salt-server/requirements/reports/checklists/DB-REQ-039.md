# DB-REQ-039 — 체크리스트

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`) · `38e2d16d` · `dd7f536a`

### 수용 기준 2/2
- [x] 메타 하나 빠진 `tip` INSERT 실패 — `ContentEndToEndTest` DB 제약(23502)
- [x] 같은 키 구간 겹침 INSERT 실패 — 같은 테스트(23P01) · 도메인 `PolicyParamSet` 경계 표(겹침 · 끝 미정 둘 · 값과 말 · 순서 · 공식 출처)

### 검증
- `./gradlew check` — 앱 77 · content 도메인 8 · 원문 검사 3 통과(실 Postgres 14 · RabbitMQ)
- jOOQ 생성: text 키 열을 생성기가 못 읽어 키 열은 varchar(64·128) · 정규식 · 배타 CHECK 는 `[jooq ignore]` 안 ALTER
- 로컬 운영 DB: `svc_content` LOGIN(관리자) · 기동 때 Flyway V1 · 글 5 · 파라미터 6 동기화 · 남의 스키마 SELECT 42501(종단 테스트)

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-6 `quiz_answer` | 퀴즈 화면 · API 가 S2b | ~~금융 팁 S2b~~ **정정 2026-11-05(S2b)** 닫힘 |
| EXPLAIN | 행이 수십 개(글 5 · 사용자 신호) — 인덱스(`user_signal_user_idx` · `tip_revision_slug_idx`)만 두고 재지 않았다 | 사용자 신호가 천 행을 넘을 때(~~S2b 계측~~ **정정 2026-11-05(S2b)** S2b 는 재지 않았다 — 표가 비어 있다. 공개 뒤 행이 쌓일 때 `quiz_answer` 와 같이) |

## 2026-11-05 — 금융 팁 S2b(`MONEY-S2b-tips-quiz-diff`) · `d2d662d4`

- 몫: FR-6 `quiz_answer`(V2) · `tip_revision.body_lines`
- 검증: 종단 테스트(실 Postgres · 서비스 계정 · Flyway V1→V2) — 같은 사람 · 글 네 번 풀이 = 한 행 `attempts=4` · 카드 시각 유지. 로컬 운영 DB 에 V2 적용(기동 로그) · 확인용 임시 행(이력 1 · 풀이 2)은 확인 뒤 삭제(`quiz_answer` 0 행)
- 미검증: `EXPLAIN` — 사용자 ≤10 · 표가 비어 있어 의미 있는 계획이 안 나온다. 조회는 (user_id, correct_at DESC) 부분 인덱스 하나 · 행이 쌓이는 공개 뒤 잰다(공개 직전, `FE-REQ-058` LCP 와 같은 때)
