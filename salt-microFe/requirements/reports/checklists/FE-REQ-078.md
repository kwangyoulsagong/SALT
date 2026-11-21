# FE-REQ-078 체크리스트 — 휴대폰 웹 푸시

2026-11-21 `feat/f019-s4-web-push` · zone 여섯 운영 빌드 · 설치 Chrome(Playwright 1.56 · `Pixel 7` · 영구 프로필 — 일회 문맥은 푸시 구독이 "permission denied") · standalone 은 `matchMedia` 흉내 · 실 BFF · 실 Kotlin · 실 FCM · 임시 계정(끝나고 `DELETE /api/app/me` 200 · 사용자 0 · 구독 0 · 초대 코드 0).

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 설치 전 | 충족 | 브라우저 탭 — "홈 화면에 추가한 앱에서 켤 수 있어요" · 토글 0 |
| FR-1 설치 앱 | 충족 | 도메인 셋 · 서버 순서(투자 · 저축 · 가계부) · 다 꺼짐 · 판정 경계 `push.test.ts` 9 |
| FR-2 켜기 | 충족 | 저축 누름 → 실 FCM 구독 · 서버 행 · 설정 켜짐 · 토글 켜짐 |
| FR-2 끄기 | 충족 | 마지막 도메인 끔 → 설정 꺼짐 · 서버 행 0 · 브라우저 구독 0. 순서 경계 6 |
| FR-3 push | 충족 | 목표 도달 → 이 브라우저 알림 "저축 목표에 닿았어요" · 본문에 이름 · 금액 0 · `data.navigate` = `/m/goals`. `serviceWorkerPush.test.ts` 11(가짜 `self` 에서 실제 실행 — Declarative 중복 0 · 깨진 본문도 하나 · 주소 규칙 core 와 같은 표) |
| FR-3 누름 | 시험만 | 창 옮기기 · 새 창 — 시험. 실브라우저 알림 누름은 헤드리스로 못 누른다 |
| FR-4 대조 | 충족 | 다시 열기 → 같은 행 `last_seen_at` 갱신 · 행 하나 |
| 누름 칸 · 넘침 · 글자 | 충족 | 390 · 360 · 글자 ×2 — 토글 56×44(그림 52×32 에서 누르는 자리만 키움) · 넘침 0 · 13 미만 0 |
| 명령 | 통과 | `check-types` 14 · `lint` 14 · `test`(core 408 · web-shared 37 · ui 99 …) · `test:layer-check` 22/15 · zone 여섯 운영 빌드 · Bash 로 고친 파일 훅 사후 0 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| iOS 설치 앱 푸시(Declarative · 권한 창 · 잠금 화면) | 휴대폰이 없다 — 이 맥 Chrome 만 | `QA-001` Q-9(사용자 iPhone, iOS 18.4+) |
| Android 실기기 · 알림 누름 실동작 | 같은 이유 · 헤드리스는 알림을 못 누른다 | `QA-001` Q-9 |
| 진짜 standalone(설치) | Playwright 는 PWA 설치를 못 한다 — 표시 모드만 흉내 | `QA-001` Q-9 |
