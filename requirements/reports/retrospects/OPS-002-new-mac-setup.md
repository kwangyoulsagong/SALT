# OPS-002 새 맥 이전 회고

- 새 맥에서만 드러나는 결함이 넷 있었다 — 옛 맥에 깔려 있던 것(nvm 경로 · 낮은 Python · Docker)과 `.env` 를 통째로 읽는 launchd 가 가렸다
- **"부른 셸의 것"을 박는 설정은 셸이 바뀌면 깨진다** — node 는 부른 셸 · Python 은 uv 의 최신 · Compose 는 .env 일부만. 셋 다 "그 폴더가 정한 것"으로 바꿨다
- Compose platform 은 S3b(11-12) 뒤 한 번도 뜨지 않았다 — `kotlin-platform.md` 가 "실행 jar 로 한 번 띄운다"를 요구하지만 그 뒤 아무도 Compose 를 다시 띄우지 않았다
- 내가 KIS 키 종류를 확인하려 토큰을 먼저 받아 서버 기동 일봉 50이 1분 제한(403)에 걸렸다 — 상시 프로세스가 쓰는 키는 손으로 시험하지 않거나, 시험 뒤 1분 기다려 재시작한다
- Action: 새 런타임 · 새 환경 변수는 버전 파일 · Compose `environment` 와 함께 넣는다(Compose 에 `${X:?}` 로 — 빠지면 기동 전에 막힌다)
