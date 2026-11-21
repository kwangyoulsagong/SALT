# F019 순서 4 체크리스트 — 휴대폰 웹 푸시

| 영역 | 결과 | 근거 |
|---|---|---|
| 서버 · DB | 충족 | `./gradlew check` exit 0 — `PushSpec` 5 · `WebPushSpec` 3(RFC 8291 부록 A 바이트 일치) · `SendPendingPushesSpec` 2 · `PushEndToEndTest` 2 · `NotificationEndToEndTest` 4 · `MyDataEndToEndTest` 8 · Flyway v3 로컬 적용 |
| BFF | 충족 | `npm test` 615 · `npm run build` |
| FE | 충족 | `check-types` · `lint` · `test`(core 408 · web-shared 37 …) · `test:layer-check` · zone 여섯 운영 빌드 |
| 실경로 | 11/11 | 설치 Chrome(영구 프로필) → BFF → Kotlin → **실 FCM** → 서비스 워커 알림 "저축 목표에 닿았어요"(이름 · 금액 0) · 다시 열면 대조 · 마지막 끄기 = 구독 0 · 허용 밖 주소 400 · 서버 로그 `delivered=1` |
| 버그 검증 | 고침 8 | 서버 넷(곡선 밖 키 · 상한 10 · 끈 도메인 · 기기 오류 격리) · FE 넷(로그아웃 구독 빼기 · 주인 확인 · 누름 폴백 · 로그아웃 기다림). 변이 6/6 잡힘 · 실경로 14 항목 통과 |
| 휴대폰 배치 | 충족 | 390 · 360 · 글자 ×2 — 넘침 0 · 13 미만 0 · 토글 누름 칸 44 |
| `check-done.mjs` | 통과 | done 전 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| iOS · Android 실기기(설치 · 권한 창 · 잠금 화면 · 알림 누름) | 휴대폰이 없다 | `QA-001` Q-9 |
| Apple · Mozilla 푸시 서비스 왕복 | 이 맥은 Chrome(FCM)만 | `QA-001` Q-9 |
| 휴대폰 UA · 데스크톱 화면 로그아웃 때 `ViewTransition` 중단 오류 | 이 브랜치 전부터(푸시 없는 계정 3/3) | 다음 휴대폰 REQ |
| 운영 키 · 공개 주소 | 배포 환경 없음 | `OPS-001` |
