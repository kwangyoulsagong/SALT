# DB-REQ-040 — 회고

## 2026-11-06 — 서버 S2c notification(`MONEY-S2c-notification`) · `9cee4715` · `33e949e8` · `2fa68f61` · `f1a3c64c`

- 문서의 주인(identity)과 읽는 쪽(notification)이 달랐다 — 착수 전 네 질문 ③에서 잡았다. 루트 회고 `MONEY-S2c-notification`

## 2026-11-06 — 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`)

- 목록 열을 배열 대신 쉼표 키로 — jOOQ 생성기(H2 흉내)가 `text[]` 를 못 읽을 위험을 피하고, 집합 규칙은 도메인이 지킨다. 모양은 CHECK 로 이중
- Action: S3b 이동 때 이 표는 그대로(이미 identity 스키마)

## 2026-11-12 — 서버 S3b(`MONEY-S3b-identity-accounts`)

- FR-1 이동 · FR-5 서명 키 — Flyway V2 · 가져오기 대조 5 · 6 · 6. 회고 본문은 루트 `requirements/reports/retrospects/MONEY-S3b-identity-accounts.md` — 플랫폼 단독 종단이 BFF 의 `Bearer undefined` 를 몰랐다 · 반쯤 옮긴 상태의 FK 틈
- Action: 경로를 옮기면 BFF 를 거친 실스택을 첫 확인으로

## 2026-11-12 — 서버 S3c

- 덧붙이기만 원장의 예외는 세션 표지(`SET LOCAL salt.erase`) 하나 — 지우는 함수 한 곳만 켠다. 예외를 UPDATE 까지 넓히는 변이가 처음엔 살아남아 단언을 더했다
- 내보내기 요청 표를 정정으로 뺐다 — 저장하지 않으면 만료도 없다

## 2026-11-13 — 서버 S3d

- jOOQ 코드 생성(H2 흉내)이 text 열 키를 못 읽어 첫 마이그레이션이 깼다 — 열 이름(`day` · `domain`)부터 의심했다가 쪼개 보니 text PK 였다. 규칙 §4 에 이미 있는 내용 — 새 표는 키 열을 varchar 로

## OPS-004 짝 (2026-11-13)

- 배운 것 없음 — 짝 변경

## 2026-11-14 — F017 v4 2a 걸침

- 머리 주석이 이 REQ 를 가리키는 파일을 `SRV-REQ-058` 이 걸쳤다 — 동작 변경은 위 체크리스트 한 줄뿐

## 2026-11-16 — F017 v4 순서 5 짝

- 이 REQ 의 기능 변경 없음 — 공유 파일에 한 자리. 회고 본문은 루트 `requirements/reports/retrospects/F017-v4-stage5-ontology.md`


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

- **잘 된 것** — 실제 원문 · 전 종목을 눈으로 살펴 첫 판 결함 여섯을 done 전에 잡았다(디코딩 · 월간 공시 · 건수 규칙 · IR 내용 칸 · 스키마 CHECK 둘).
- **아쉬운 것** — 스키마 불변식(`scheduled_event` `announced_at <= event_at`)을 설계 전에 읽지 않아 실행에서야 걸렸다. 선언을 믿는 디코더가 3일 동안 한글을 깨뜨렸는데 숫자 대조가 통과해 아무도 몰랐다.
- **다음에** — 새 원천은 저장된 본문을 한 건 눈으로 본다(글자가 사람이 읽을 수 있나) · 표에 행을 쓰는 설계는 그 표의 CHECK · FK 부터 읽는다. 기계 검사는 `dartDecode.test.ts`(실제 원문 픽스처)로 둔다(done 체크리스트 §1).

## 2026-11-18 F006 코치 대화 1단계 — 같은 파일

- 이 REQ 몫 변경 없음 — 기록만

## 2026-11-18 — F006 대화 2단계 짝

- 머리 주석 주인이라 걸렸다 — 이 REQ 의 계약은 그대로. Action 없음
