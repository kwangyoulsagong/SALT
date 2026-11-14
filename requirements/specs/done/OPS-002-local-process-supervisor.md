---
id: OPS-002
title: "로컬 전체 기동 · 상태 명령 — 데이터를 모으는 프로세스는 전부 상시(launchd), 빠진 것은 상태표가 말한다"
priority: high
labels: [ops, local, server, bff, forecast, fe]
created: 2026-11-02
source: 사용자 "전체 서버 다 키는 명령어가 필요하네 이거 보니까" · "계속 머 까먹어서" (2026-11-02)
---

## Summary

배포 환경(`OPS-001`)이 생기기 전까지 이 맥이 서버다. 프로세스가 7개인데 상시(launchd)는 서버 · 예측 배치 둘뿐이었고 나머지는 사람이 기억해서 띄웠다.
2026-11-02 F008 해설 근거 슬라이스의 실데이터 확인에서 **뉴스 워커가 09-29 09:01(UTC)부터 꺼진 채**(해설 인용이 한 달 전 기사) · **BFF 시세 워커도 꺼진 채** 발견.

`ops/salt.sh` 하나로 켜고(`up`) · 보고(`status`) · 내리고(`down`) · 재시작(`restart`) · 로그(`logs`) · 등록할 plist 확인(`plist`).

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | **데이터를 모으는 프로세스는 전부 상시** — 서버 · 뉴스 워커 · BFF REST · WS · 시세 워커 · 예측 배치를 launchd 에 등록(재부팅 · 죽음 뒤 다시 뜬다). watch 없이(`tsx watch` 중복 로그 101GB 교훈) · 로그 20MB × 5 | 완료 — 2026-11-02 10:07 등록(사용자 요청으로 Claude 가 `up --replace`) |
| FR-2 | 웹 dev(3000)는 상시가 아니다 — `up` 이 백그라운드로 띄운다(빌드 · 재시작이 잦다) | 완료 |
| FR-3 | `status` — 이름 · 방식(launchd · 수동 · 남의 것) · PID · 포트 · 헬스(4000 · 4001) · postgres · **데이터 신선도**(뉴스 마지막 수집 3시간 · 코인 시세 마지막 갱신 10분 넘으면 ✗). 프로세스가 떠 있는데 안 모으는 경우를 잡는다 | 완료 |
| FR-4 | 포트를 다른 프로젝트가 쓰면 건너뛰고 알린다. 수동으로 띄운 SALT 프로세스는 그대로 두고, `up --replace` 일 때만 내리고 launchd 로 바꾼다 | 완료 |
| FR-6 | **재시작에 고아 0 · 10초 안** — ① 서버 종료 처리 5초 상한(전엔 SIGTERM 뒤 DB 연결 닫기에서 멈춰 포트를 20초+ 쥐었다) ② 실행 스크립트 공용 `ops/lib-run.sh`: 종료 신호에 프로세스 그룹 전체 · 시작 때 같은 폴더 옛 프로세스 정리(진입 파일 경로로 찾는다) · 포트가 빌 때까지 최대 15초 ③ `restart` 는 `kickstart -k` 대신 내리기 → 비기 확인 → 올리기 | 완료 |
| FR-7 | **launchd · 서버 실행 PATH 에 `~/.local/bin`** — 서버가 해설 다듬기 로컬 CLI(Claude Code)를 PATH 에서 찾는다(`SRV-REQ-050` FR-2). 없으면 nvm 경로의 codex 만 잡혔다(2026-11-02 실측). `ops/salt.sh` `LAUNCH_PATH` · `salt-server/ops/run-server.sh` 둘 다 | 완료 2026-11-02 — 기동 로그 `해설 로컬 CLI local_claude 2.1.316` |
| FR-8 | **2026-11-13(서버 S3d)** `ops/salt.sh usage` — 최근 8주 도메인 사용(주간 활성 · 재개율 · 카드 클릭, `ops/usage-weekly.sql` · 사람 id 0). 같은 날 빠져 있던 웹 zone `web-tips`(3005)를 이름 표 · `DEV_APPS` 에 넣음 — 금융 팁 경로가 셸 프록시 뒤에서 죽어 있었다 | 완료 |
| FR-5 | plist 는 스크립트가 만든다(손으로 고치지 않는다). node 경로는 실행한 셸에서 읽는다 — nvm 버전을 박지 않는다 | 완료 |

## 판단

1. **뉴스 · 시세 워커를 서버 프로세스에 합치지 않고 launchd 로 따로** — 합치면 코드 변경(서버 · BFF 두 영역)이고 시세 워커는 BFF 프로세스 경계(`websocket-worker.md` "worker 는 직접 실행될 때만")를 지킨다. 프로세스 감독만 바꾼다
2. **web-tax(3001)는 띄우지 않는다** — 세금 기능은 `ADR-002` 로 빠졌고 3001 은 지금 다른 프로젝트가 쓴다
3. **`down` 은 상시 서버까지 내린다** — "전부 끄기"가 기대값. 다음 `up` 이 다시 올린다

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 배포 환경의 프로세스 감독 | 관리형 컨테이너가 대신한다 | `OPS-001` |
| 상태 이상 알림(푸시) | 지금은 `status` 를 사람이 본다. 예측 `ops_monitor`(FC-REQ-018)는 배치만 본다 | 필요해지면 — `status` 의 ✗ 를 알림으로 |

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-11-02 | FR-7 PATH(`~/.local/bin`) — `requirements/specs/done/F008-explain-llm-routing-slice.md` |
| 2026-11-02 | MONEY-F1(`FE-REQ-053`) 에서 이 REQ 가 걸렸다 — 투자 화면 `apps/web/src` → `packages/domain-invest/src`(내용 무변경) · 투자 zone 조립(`b00b0cea`). 파일 1개(경로 이동 내용 무변경 0 · 수정 1 · 추가 0 · 삭제 0). 계약 · 동작 무변경 |
| 2026-11-03 | MONEY-F2(`FE-REQ-054`) — `ops/salt.sh` 머리 주석 두 줄: 웹은 dev 로만 띄운다 · 운영 빌드(`next start`)를 넣으려면 `pnpm static:merge` 먼저(운영은 zone 공용 `/_next`, `ADR-005` 규칙 7 개정). 동작 무변경(`bash -n` 통과 · `ops/salt.sh up` · `status` 정상) |
| 2026-11-03 | MONEY-S1a — 이 REQ 에 걸린 몫(`8d05a006`): `ops/salt.sh` 이름 표에 `platform`(launchd · :4010 · 헬스 `/actuator/health`) · `web-savings`(dev 3003). 실행 스크립트 `salt-platform/ops/run-platform.sh`. **launchd 등록은 이 세션 권한에서 막혀 사용자 실행 대기**(`ops/salt.sh up`) — 그 전까지 platform 은 수동 기동 |
| 2026-11-03 | `9265c0b4` — platform launchd 등록 완료. launchd 아래 java 가 데스크탑 폴더의 jar 를 여는 `open()` 에서, docker compose 가 compose.yaml 읽기에서 멈췄다(macOS 개인정보 보호, `sample` 로 확인) → jar 를 `~/Library/Application Support/SALT` 에서 · RabbitMQ 가 떠 있으면 compose 생략 · 20초 상한. 상태 ok |
| 2026-11-04 | 가계부 S1a(`MONEY-S1-household-entry`) — `ops/salt.sh` 이름 표에 `web-household`(dev 3004 · 로그)(`2d4db66c`) |
| 2026-11-04 | 가계부 S1a — `salt-platform/ops/run-platform.sh` 에 `HOUSEHOLD_DB_PASSWORD`(`63146ddf`) |
| 2026-11-05 | 금융 팁 S2a(`MONEY-S2a-tips-content`, 루트 `requirements/specs/done/MONEY-S2a-tips-content-slice.md`) — 이 REQ 에 걸린 몫: `salt-platform/ops/run-platform.sh` 에 `CONTENT_DB_PASSWORD`(← `.env` `LOCAL_DB_CONTENT_PASSWORD`) · 머리 주석에 `svc_content` · 금융 팁 경로. 공개 플래그 `CONTENT_PUBLIC` 은 넣지 않는다(기본 꺼짐 — 로컬 확인은 `launchctl setenv` 뒤 재시작, 끝나면 unsetenv) |
| 2026-11-06 | 서버 S3a identity 셸 설정(`MONEY-S3a-identity-shell`): `salt-platform/ops/run-platform.sh` — `IDENTITY_DB_PASSWORD`(← `.env` `LOCAL_DB_IDENTITY_PASSWORD`) `fc0207cb` |
| 2026-11-09 | `ops/salt.sh status` 신선도 두 줄 — 국내 지수 일별(4일 넘으면 ✗) · 등락 분해 β as_of(3일 넘으면 ✗, 서버가 7일에 버리기 전). F016 단계 C `SRV-REQ-051` FR-12 |
| 2026-11-13 | 서버 S3d(루트 `requirements/specs/done/MONEY-S3d-identity-classify-usage-slice.md`) — FR-8 `usage` · `web-tips` 3005(사용자 "3000 으로 salt 켜 줘" 때 발견) |
| 2026-11-14 | 상태 줄 둘 — AI 본문(매체 RSS) · DART 공시(F017 v4 2a · 2b) |
