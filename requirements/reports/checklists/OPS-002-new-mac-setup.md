# OPS-002 새 맥 이전 체크리스트

영역 상세 `salt-server/requirements/reports/checklists/SRV-REQ-043.md` · `SRV-REQ-045.md` · `SRV-REQ-048.md`.

| 항목 | 결과 |
|---|---|
| plist node | 8개 전부 `fnm/node-versions/v22.12.0` — 다른 폴더(`/tmp`)에서 `ops/salt.sh plist news` 도 22.12.0 |
| 상시 프로세스 | server · platform · bff-rest 헬스 ok · bff-ws 4002 · news · bff-worker · forecast · forecast-live |
| 가입 → 로그인 → Express 리소스 | 초대 수락 · `/api/auth/me` 200 · 관심 목록 200(identity RS256 → Express JWKS 검증) |
| Python 3.12 | polars `str.to_lowercase() == "true"` 정상 · `backfill_whale` 재개(365일 진행) |
| brew RabbitMQ | 옮기기 전 큐 메시지 0 · platform 재시작 뒤 연결 `salt@127.0.0.1` · 큐 · 소비자 재선언 |
| run-platform.sh brew 경로 | brew 를 내리고 platform 재시작 → brew 재기동 · UP |
| Compose 전체 스택 + launchd 동시 | 고치기 전 platform 기동 실패(`AUTH_LEGACY_HS_UNTIL` 바인딩) → 고친 뒤 4011 UP · JWKS · BFF 4101 200 · launchd 4010 UP |
| `zsh -n` · `docker compose config` | 통과 |
| `node scripts/check-done.mjs` | 통과 |

| 미검증 | 사유 | 언제 |
|---|---|---|
| 재부팅 실측 | 이 세션에서 재부팅하지 않았다 — LaunchAgent RunAtLoad · brew 서비스 등록만 확인 | 다음 재부팅 |
| 셸 웹 3000 실화면 | 3000 을 다른 프로젝트가 쓴다 | 3000 이 비면 |
| FRED 시간대 결함 | 범위 밖(슬라이스 표) | 새 `FC-REQ` |
