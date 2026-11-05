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
| FR-4 나머지 트리거 · FR-6 · 8 · 9 | 슬라이스 범위 밖 | 금융 팁 S2b |
| notification 서비스 이전(S2 의 다른 몫) | 서비스가 다르다(`SRV-REQ-048`) | 서버 S2c |
| 코치 검증기와 한 모듈 | 언어가 다르다(Express TS) | S6(`SRV-REQ-049` FR-4) |

## 2026-11-05 — 금융 팁 S2b(`MONEY-S2b-tips-quiz-diff`) · `d2d662d4`

- 몫: FR-7 줄 diff(`LineDiff` · `body_lines`) · FR-8 퀴즈(원문 네 칸 · 공개 채점 · 기록 채점 · 카드 모음) · 첫 판 이력 정정 · 예약 slug `cards`
- 검증: `./gradlew check` 통과(content 종단 7 — 새 2: 퀴즈 공개 글 정답 0 · 익명 채점 기록 0 · 처음 맞힘 한 번 카드 · 틀려도 카드 남음 · 남의 카드 0 · 시도 4 한 행 / 줄 diff 첫 판 null · 유효기한 연장 그 줄만 · 상태만 바뀐 판 []) · 도메인 `QuizDiffSpec` 11(네 칸 각각 · 경계표 15행 · 법적 선 변이 3 · 채점 경계 · LCS · 큰 판 null · 이력 diff · 검수일만 같은 줄 · 예약 slug) · `CatalogSpec` 원문 다섯 퀴즈 통과 · `bootJar` 실행 jar 기동(로컬 운영 DB Flyway V2 적용)
- 실화면: 슬라이스 체크리스트
- 미검증: 없음(이 몫 안). FR-6 · FR-4 나머지 · FR-9 는 범위 밖(S2d · S3)
