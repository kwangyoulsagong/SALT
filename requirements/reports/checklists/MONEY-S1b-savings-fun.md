# MONEY-S1b — 목표 저울 · 비상시 · 놓친 달 · 모으는 재미 — 체크리스트

슬라이스 `requirements/specs/in-progress/MONEY-S1b-savings-fun-slice.md` · 커밋 `9a435627` · `f4deeee6` · `84871e70` · `6ad345fc` · `34815177` · `ca1fcb11` · `5171d03d` · `88ede7aa`

## 1. 수용 기준

| REQ | 결과 | 근거 |
|---|---|---|
| `SRV-REQ-045` | 4/4 | 계산 경계 `SavingsMathSpec` 11 + `SavingsFunSpec` 12 · `trackReason` 늘 · 서버 문장 0(상태 · 가정 키만) · 옛 경로 은퇴(S1a) |
| `DB-REQ-037` | 3/3 | S1a 판정 유지. S1b 몫: V2 적용 · 되돌리기 = 표 하나 drop(참조 없음) |
| `BFF-REQ-047` | 2/2 | 가공 0 테스트(경로 5 추가) · `degraded` 전달(S1a) |
| `FE-REQ-056` | 4/4 | 계산 0 grep(아래) · 금지어 0 · 줄인 모션 실측 중간 프레임 0 · 회귀 0(목록 · 만들기 · 상세 · 적립 · 나눠 넣기) |

## 2. 검증 — 실행한 것

| 무엇 | 결과 |
|---|---|
| Kotlin `./gradlew check` | 통과 — 저축 종단 13 · 도메인 31 · 플랫폼 14 · ArchUnit 8. 목록 쿼리 3회 · 집계 두 경로 값 대조 · 기한 판정 · 사유 코드 · 상한 409 · 남의 것 404 |
| 실행 jar | `bootJar` → launchd platform 재시작 → 로컬 운영 DB Flyway v2 적용 · health UP |
| BFF | `npm run build` · `npm test` 352 |
| 프론트 | check-types · lint · test(core 83 · ui 43) · test:layer-check 26 · 훅 사후 실행 · zone 5 운영 빌드 · Storybook 빌드 |
| 실스택 | BFF 4001 → platform 4010 → 로컬 DB(임시 사용자): 경로 5 · 저울 확정 · 비상시(8,561원 × 12 − 10만 = 이자 2,732원) · 단위 상한 · 적립 → 장면 한 칸 · 도장 +1 |
| 실화면 3003 | 가로 넘침 0 — 768 · 900 · 1024 · 1280 · 1440 · 1600 · 앱 웹뷰 390 · 768. 서버 HTML 에 장면 글 · 엽서 · 첫 도장 |
| 모션 | 기본 10프레임 이동 · 줄인 모션 중간 프레임 0 |
| 금지어 · 계산 grep | 0 · 0(`domain-savings` 에 `/ 100` · `* 100` · `Math.` · `reduce(` 금액 연산 없음 — 아래 §5) |
| 임시 데이터 | 임시 사용자 목표 · 적립 · 단위 · 발행(트리거 잠시 끔) · 아웃박스 삭제 → 가져온 목표 1건만 · 트리거 다시 켬 |
| 독립 코드 리뷰(high) | 10건 — 전부 코드로 사실 확인 뒤 수정(`34815177` · `ca1fcb11` · `5171d03d`) |

## 3. 걸린 기존 REQ(주인 집계)

`FE-REQ-009`(레지스트리) · `FE-REQ-013`(조회 훅 파일 머리) · `FE-REQ-044`(장면 컴포넌트 · 배치표 P-24) — 각 스펙 Changelog · 체크리스트 · 회고에 한 줄.
짝 영역 변경 없음: 예측(`FC-REQ-024` — 채점 사본은 범위 밖, 이벤트 계약 무변경) · RN(`RN-REQ-033`) · Express 서버(무변경).

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 셸(3000) 경유 실화면 | 3000 은 이날도 다른 프로젝트. 이번 변경은 저축 zone 안 화면뿐(경로 · 셸 · rewrites 무변경) — S1a 에서 셸 3010 경유를 쟀다 | 3000 이 비는 날 한 번(`FE-REQ-056` 회고 Action) |
| zone 직접 접속 때 `/api/session` 404 콘솔 오류 | 셸 경로라 zone(3003) 에 없다 — 쿠키 세션 1단계(`0ef25f6b`)부터. 셸 경유에선 없다 | `FE-REQ-013` FR-80 2단계 |
| `item_unit` 실행 계획 | 표가 비어 `EXPLAIN` 이 뜻이 없다 | 행이 쌓이면(`DB-REQ-037` 회고 Action) |
| 오늘 돈 · 제도 · 공동 · 가계부 구독 · 채점 · 템플릿 단위 · 엽서 사진 · 팬 차트 · 팁 카드 | 원천 · 서비스 · 저장소가 먼저 | 슬라이스 범위 밖 표 |

## 5. 계산 0 grep

`grep -rnE "(/ ?100|\* ?100|Math\.|\.reduce\()" salt-microFe/packages/domain-savings/src` → 1줄: `StampBoard.tsx` `Math.min(count, BOARD_MAX)` — 도장 그림을 30개까지만 그리는 표시 상한(금액 아님). 금액 · 날짜 연산 0.
