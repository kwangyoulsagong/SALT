# MONEY-S2c-notification — 체크리스트

## 2026-11-06 — 구현 · 확인 · done

커밋 `9cee4715`(Kotlin notification · coach 발행 창구) · `33e949e8`(Express 은퇴 · drop) · `2fa68f61`(BFF) · `f1a3c64c`(FE).
영역 체크리스트: `salt-server/.../SRV-REQ-048.md` · `DB-REQ-040.md` · `DB-REQ-036.md` · `SRV-REQ-044.md` · `bff/.../BFF-REQ-046.md` · `salt-microFe/.../FE-REQ-055.md` 외 짝 REQ.

### 수용 기준
- `SRV-REQ-048` 4 "알림 설정 없는 사용자 발송 0" — **충족**(종단 테스트: 설정 없음 + coach 이벤트 → 처리 기록만 · 행 0 / 실스택: 새 사용자 GET 설정 셋 다 false · 알림 0). 1~3 은 S3
- `DB-REQ-040` 2 "설정 행이 없는 사용자는 모든 도메인 꺼짐" — **충족**(`NotificationSpec` · 종단 · 실스택). 1 은 S3

### 검증(최종 HEAD)
- Kotlin `./gradlew check` 통과(54초 — Modulith · ArchUnit · 실 Postgres · RabbitMQ): `NotificationSpec` 5(설정 없음 = 꺼짐 · 도메인 → 종류 · 코드 형식 경계 · 금액 관문 경계 · 이벤트 → 초안) · `NotificationEndToEndTest` 4(기본 꺼짐 0건 / 투자 켬 — **Express 처럼 coach.outbox 행 → 릴레이 → signal_update** · 2시간 억제 · 읽음 · 남의 것 0 · 끄면 빠짐 · 틀린 도메인 · 빈 본문 400 / 저축 목표 도달 · 가계부 고정비 오름 → 코드만 · 금액 · 가맹점 · 목표 이름 0 · 모두 읽음 / 만료 정리 · 남의 스키마 권한 오류) · `bootJar` 실행 jar → 로컬 운영 DB(Flyway notification V1 · coach V1)
- Express `npm run build` · `lint` · `npm test` 929/929(새 `decisionChangedPayload` 2 — 계약 파일과 칸 · 패턴) · `test:layer-check` 10/6 · `prisma migrate deploy`(drop) · `/api/investment-notifications` 404
- BFF `npm run build` · `npm test` 404/404(새 `app-alerts` 3 · 뷰모델 종류 셋)
- FE `pnpm check-types` · `lint`(web) · 레이어 훅 사후(Bash 로 쓴 새 파일 16 + 바꾼 2 — 막힘 0)
- 셸 web 운영 빌드(별도 worktree — 상시 dev `.next` 무관): main `/settings` 146 → **148 kB**(+2) · 공용 103 그대로
- 데이터 이전: 덤프 · 복원 시험(1행) → `notification-import.sql` 대조 통과 1행 · 다시 돌려도 1행(멱등) → drop
- 실스택(임시 사용자 · BFF 4001 → platform 4010 · Express 4000): 설정 셋 false → 저축 켬 · 없는 도메인 400 `NOTIFICATION_DOMAIN_UNKNOWN` / 저축 목표 도달 → `goal_reached` / **Express `OutboxDecisionChangeNotifier` 실행 → coach.outbox `published_at` → `signal_update`** → BFF `/api/app/alerts` 2건 · 안 읽은 수 2
- 실화면(셸 3001 · 앱 웹뷰 UA 390 · 사용자 넷): 데이터 있음(1280 — 켬/끔 저장 · 새로 고침 뒤 유지 · 키보드 Space) · 빈(390 — 셋 다 꺼짐 · 넘침 0) · 로그아웃(패널 없음 · 설정 요청 0) · 실패(`route` — 조회 500 → 안내 한 줄 · 토글 0 / 저장 500 → 되돌림 + 안내) · 자리 칸 → 값 높이 차이 0(1280 · 390) · 콘솔 오류 0
- 실화면 결함 셋(고침): 이름 길이가 달라 토글 열이 어긋남 → 이름 · 설명 왼쪽 · 토글 오른쪽 끝 / 로그아웃이면 제목 · 설명만 남은 빈 패널 → 패널째 기능이 그림 / 자리 칸 164 vs 실제 148 → 148. 조회 실패 재시도 3 → 1(몇 초 빈 칸)
- 정리: 임시 사용자 둘 — notification · 설정 · content 신호 · 저축 목표 · 적립 · 발행(append-only 트리거 한 트랜잭션 안에서 잠시 끔) 행 0 확인 · 3001 내림

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 웹 알림 목록 · 벨에서 알림이 보이는 것 | 화면이 없다 — BFF 응답까지만 확인 | F006(`FE-REQ-030` FR-80 · 81 · 110) |
| 앱 푸시 | 앱 미착수 | `RN-REQ-035` FR-4 |
| coach 판단 변화가 실제 워커에서 나는 것 | 판단이 바뀌는 때를 기다려야 한다 — Express 코드(`OutboxDecisionChangeNotifier`)를 직접 불러 같은 길을 확인 | 다음 판단 변화(옛 표 기준 하루 한 번 안팎) — `coach.outbox` 행으로 확인 |
