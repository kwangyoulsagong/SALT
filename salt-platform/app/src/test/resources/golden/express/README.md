# Express 골든 — 2026-11-03 로컬 `salt-server`(:4000, launchd `com.salt.server`)에서 녹화

| 파일 | 요청 |
|---|---|
| `401-no-token.json` | `GET /api/goals` (Authorization 없음) |
| `401-invalid-token.json` | `GET /api/goals` `Authorization: Bearer abc.def.ghi` |
| `401-expired-token.json` | `GET /api/goals` — `JWT_SECRET` 으로 서명한 `expiresIn: -10` 토큰 |
| `404-no-route.json` | `GET /api/no-such-route?x=1` |

플랫폼이 같은 요청에 **바이트까지 같은 본문**을 내야 한다(`SRV-REQ-043` 수용 기준 "에러 바디가 Express 와 같은 모양").
Express 쪽 문구가 바뀌면 다시 녹화한다. 경로별 골든 녹화 · 재생 도구는 BFF 쪽(`BFF-REQ-045` FR-2)이다.
