# BFF-REQ-056 체크리스트 — 웹 푸시 경로 셋

| FR | 결과 | 근거 |
|---|---|---|
| FR-1 설정 | 충족 | `app-alerts.test.ts` — 켜짐은 공개키 문자열일 때만(경계 6) · 실경로 `{enabled:true, publicKey(87자)}` |
| FR-2 넣기 | 충족 | 시험 — 세 칸만 넘김(나머지 · `userId` 버림) · 실경로 400 `PUSH_SUBSCRIPTION_INVALID` 그대로 · 설치 Chrome 구독 204 |
| FR-3 빼기 | 충족 | 시험 경로 1:1 · 실경로 마지막 끄기 뒤 서버 행 0 |
| 명령 | 통과 | `npm test` 615 · `npm run build` |

## 미검증 · 범위 밖

없음 — 브라우저 쪽 실기기(iOS)는 `FE-REQ-078` 표
