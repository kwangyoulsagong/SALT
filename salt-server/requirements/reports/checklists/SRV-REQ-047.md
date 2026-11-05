# SRV-REQ-047 — 체크리스트

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`) · `38e2d16d` · `dd7f536a`

### 수용 기준 3/3
- [x] 메타 빠진 글 발행 실패 · 금지 문장 변이 실패 — `ContentSpec` 8 · `CatalogSpec` 3(레포 원문 전부 통과)
- [x] 유효기한 경계(당일 · 다음 날) — `ContentSpec`
- [x] 법무 검토 기록 전 공개 플래그 꺼짐 — `ContentSettingsSpec` · 실행 jar 기본 꺼짐(`/api/content/tips` → public=false)

### 검증
- `./gradlew check` 통과(앱 77 · 도메인 8 · 원문 3) — 경계(Modulith · ArchUnit) · 실 Postgres · RabbitMQ
- 종단(`ContentEndToEndTest`): 공개 목록 · 글(본문 세 꼴 · 첫 판 이력 · 사용자 데이터 0) · 비로그인 401 · 맥락 400 · **저축 주거 목표 → GoalCreated → 릴레이 → 구독 → 주거 글** · 닫기 두 번 = 한 행 · 파라미터 기준일 경계 · 다시 동기화 이력 · 이벤트 0 · 제약
- 실행 jar → 로컬 운영 DB: 기동 로그 `tips=5 revised=5 paramsChanged=6` · BFF 경유 · 실화면(공개 플래그를 잠깐 켜서 — 확인 뒤 끔)
- 원문 사실 대조: 보도 · 법령 2차 자료(결혼세액공제 제92조 · 주택청약 제87조 일몰 2028-12-31 · 예금보호 2025-09-01 1억). **법령 원문 · 법무 확인은 아직** — 그래서 공개 플래그가 꺼져 있다

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 법무 확인(금소법 · 자본시장법 원문 대조) · 공개 | 사용자 결정 2026-10-30 — 확인 기록 전 공개 금지 | 법무 확인 기록 시 `CONTENT_PUBLIC=true` |
| 원문 숫자 법령 원문 대조 | 보도 · 2차 자료로 대조했다(출처 칸은 공식 페이지) | 법무 확인과 같이 |
| FR-4 나머지 트리거 · FR-6 · 8 · 9 | 슬라이스 범위 밖 | ~~금융 팁 S2b~~ **정정 2026-11-05(S2b)** FR-8 닫힘 · FR-4 나머지 · 6 S2d · 9 S3 **정정 2026-11-05(S2d)** 내 숫자 · 고정비 증가(주거) 닫힘(`MONEY-S2d-tips-my-numbers`) — 나머지 트리거는 원천 · 글이 생길 때 |
| notification 서비스 이전(S2 의 다른 몫) | 서비스가 다르다(`SRV-REQ-048`) | 서버 S2c |
| 코치 검증기와 한 모듈 | 언어가 다르다(Express TS) | S6(`SRV-REQ-049` FR-4) |

## 2026-11-05 — 금융 팁 S2b(`MONEY-S2b-tips-quiz-diff`) · `d2d662d4`

- 몫: FR-7 줄 diff(`LineDiff` · `body_lines`) · FR-8 퀴즈(원문 네 칸 · 공개 채점 · 기록 채점 · 카드 모음) · 첫 판 이력 정정 · 예약 slug `cards`
- 검증: `./gradlew check` 통과(content 종단 7 — 새 2: 퀴즈 공개 글 정답 0 · 익명 채점 기록 0 · 처음 맞힘 한 번 카드 · 틀려도 카드 남음 · 남의 카드 0 · 시도 4 한 행 / 줄 diff 첫 판 null · 유효기한 연장 그 줄만 · 상태만 바뀐 판 []) · 도메인 `QuizDiffSpec` 11(네 칸 각각 · 경계표 15행 · 법적 선 변이 3 · 채점 경계 · LCS · 큰 판 null · 이력 diff · 검수일만 같은 줄 · 예약 slug) · `CatalogSpec` 원문 다섯 퀴즈 통과 · `bootJar` 실행 jar 기동(로컬 운영 DB Flyway V2 적용)
- 실화면: 슬라이스 체크리스트
- 미검증: 없음(이 몫 안). FR-6 · FR-4 나머지 · FR-9 는 범위 밖(S2d · S3) **정정 2026-11-05(S2d)** 내 숫자 · 고정비 증가(주거) 닫힘(`MONEY-S2d-tips-my-numbers`) — 나머지 트리거는 원천 · 글이 생길 때

## 2026-11-05 — 금융 팁 S2d(`MONEY-S2d-tips-my-numbers`) · `1a85dd2b`

- 몫: FR-6 내 숫자(`MyNumbers` 넷 · `ReadMyNumbers` · `POST /me/tips/{slug}/my-numbers`) · FR-4 `household.FixedCostIncreased` 구독(주거만) · 새 글 월세 세액공제 · 파라미터 다섯 줄 · 글 응답 `myNumbers`
- 검증: `./gradlew check` 통과(ArchUnit · Modulith 포함) · 도메인 `MyNumbersSpec` 15(주택청약 한도 안 · 넘음 · 템플릿 · 상태 거름 / 급여 경계표 — 한도와 같으면 met · 넘으면 not_met · 못 읽음 · 안 적음 unknown / 시급 209 / 앱이 모르는 요건 늘 unknown / 못 읽음 ≠ 목표 없음 / 결혼 기한 당일 met · 다음 날 not_met · 날짜 없음 unknown · 가장 이른 날짜 / 예금보호 한도와 같음 · 1원 넘음 · 끝난 목표도 셈 / 월세 5,500만 17% · 넘으면 15% · 8천만 넘으면 not_met / 파라미터 없으면 숫자 0 / 문장 전부 법적 선 / `my_numbers` 모르는 값 발행 실패 / 고정비 분류 주거만) · 종단 `ContentEndToEndTest` 9(새 2: 내 숫자 401 · 칸 없는 글 404 · 사실로 계산 · 400 둘 · 못 읽음 이유 · outbox · 개인 표 행 0 / 고정비 증가 구독 — 주거 오름 → 가계부 맥락 월세 글 · 통신 오름 → 신호 0) · `CatalogSpec` 원문 여섯 · `bootJar` 실행 jar 기동
- 실화면: 슬라이스 체크리스트
- 미검증: 없음(이 몫 안). FR-4 나머지 · FR-9 는 범위 밖

## 2026-11-05 — 금융 팁 S2d 확인 2회차

- 결함(고침): 내 숫자 경로 — 없는 날짜 500 → 400 `INVALID_GOAL_FACT`(종단 테스트 추가). 입력 경계 다섯 · Swagger 9 확인
- 검증: `./gradlew check` 다시(최종 HEAD) · 실화면 22/22
- 미검증: 없음(이 몫 안)
