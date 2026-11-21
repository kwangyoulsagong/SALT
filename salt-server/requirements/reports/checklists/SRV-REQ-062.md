# SRV-REQ-062 체크리스트 — 웹 푸시(notification)

2026-11-21 `feat/f019-s4-web-push` · `./gradlew check`(Testcontainers Postgres · RabbitMQ) · 로컬 운영(launchd platform · 실 FCM).

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 구독 넣기 · 빼기 | 충족 | `PushEndToEndTest` 1 — 401 · 다시 넣어도 행 하나 · 400 여섯(localhost · http · 메타데이터 IP · 짧은 키 · 키 없음 · 빈 본문) · 남이 빼기 0 · 주인 바뀜 · 본인 빼기. `PushSpec` 주소 경계 12 · 키 경계 7 |
| FR-1 꺼짐 503 | 충족 | `SendPendingPushesSpec` — 꺼진 설정이면 `PushDisabled` · 행 0 |
| FR-2 회차 | 충족 | `PushEndToEndTest` 2 — 목표 도달 → 기기 둘에 한 번씩 · 1초 뒤 다시 보내기 0 · 끈 사람 0 · 31분 지난 미표시는 표시만 · 410 기기 지움. `SendPendingPushesSpec` — 기기마다 한 번 · 사라짐만 지움 · 실패 남김 · 기기 없는 사람 0 · 30분 경계 |
| FR-3 암호 · VAPID · HTTP | 충족 | `WebPushSpec` — RFC 8291 부록 A 바이트 일치 · VAPID 서명 검증 · 짝 틀림 기동 실패 · 로컬 HTTP 서버로 풀린 본문(`web_push 8030` · 절대 주소) · 410/404 사라짐 · 500/429/연결 실패 = 실패 |
| FR-3 실 푸시 서비스 | 충족 | 설치 Chrome(영구 프로필) 구독 → 서버 로그 `Push run notifications=1 delivered=1` → 브라우저 서비스 워커 알림 "저축 목표에 닿았어요"(목표 이름 · 금액 0) — 우리 암호를 실제 브라우저가 풀었다 |
| FR-4 설정 | 충족 | 기본 꺼짐 · `PushProperties` 검증 · `ops/vapid-keys.mjs` 로 만든 키로 로컬 기동 |
| FR-5 내 데이터 | 충족 | `MyDataEndToEndTest` 8 통과(등급 주석 · 표 목록) · 실경로 계정 삭제 뒤 구독 0 |
| FR-6 버그 검증 | 충족 | 곡선 밖 키 → 사라짐 · 요청 0(`WebPushSpec`) · 끈 도메인 0 · 던지는 기기 하나에도 회차 끝까지(`SendPendingPushesSpec`) · 상한 10 — 열한 번째에 가장 오래 안 연 기기 빠짐(`PushEndToEndTest`). 변이 4 — 각 고침을 되돌리면 시험 실패(scratchpad 사본 되돌림) |
| 경계 · 전체 | 충족 | `./gradlew check` exit 0(Modulith · ArchUnit) · `:app:bootJar` 실행 jar 기동 · Flyway v3 로컬 적용 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| Apple(`web.push.apple.com`) · Mozilla 실제 왕복 | 이 맥엔 Chrome 만 — Safari 웹앱 푸시는 휴대폰 설치 앱 | `QA-001` Q-9(사용자 iPhone) |
| 운영 키 · `PUBLIC_ORIGIN` | 배포 환경이 없다 | `OPS-001` 배포 때 비밀 저장소에 |
| 경계 변이(위반 import) | 새 모듈 의존 추가 0 — 기존 서비스 안 | 다음 서비스 추가 때 |
