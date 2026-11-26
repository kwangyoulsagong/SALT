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
| 2026-11-16 | 새 맥 이전(루트 `OPS-002-new-mac-setup-slice.md`) — plist 의 node 를 루트 `.node-version` 으로 · 실제 경로(:A). fnm 기본 node 26 · 사라지는 multishell 경로가 박히던 것 |
| 2026-11-16 | 이름 표에 `forecast-backfill`(launchd 매시, `salt-forecast/ops/backfill.sh`) — 과거 빈 구간 메우기 · 데이터가 찬 뒤 한 번 도는 국내 백테스트. 세션 셸에서 띄운 1회 백필 · FRED 대기 · 국내 감시가 세션과 함께 죽었다(14:29 — 5분봉 296종목 중 19종목만). 같이: FRED `realtime_end` 를 미국 중부 날짜로(UTC 날짜면 KST 09~15시 배치가 매일 8개 전부 400) · `check-done.mjs` 가 `OPS-` 를 센다 |
| 2026-11-16 | 잠들었다 깨면 이어 받기 — 업비트 증분이 고정 창(1시간봉 6시간 · 5분봉 1.2시간)이라 그보다 길게 잠들면 가운데가 영영 비었다. 종목별 마지막 봉부터(상한 30일, `resume_start`). `backfill.sh` 의 "백필 뒤 밀린 최근분" 블록은 이것으로 대체 |
| 2026-11-17 | 예측 넷의 실행 경로를 개발 트리 → 실행 트리 `~/.salt-run`(머지된 main) · `up` 은 plist 가 바뀌면 다시 올림 · `sync` 명령 · `status` 실행 트리 줄 — 주인 `OPS-005` |
| 2026-11-18 | **`restart` 가 이름을 여럿 받는다** — 전엔 `$2` 하나만 재기동하고 나머지를 조용히 버렸다. F006 머지 뒤 `restart server bff-rest` 에서 bff-rest 가 옛 PID 로 남아 드러남. 체크리스트 다섯 곳(`SRV-REQ-025` · `041` · `054` · `055` · `DB-REQ-043`)에 두 이름 꼴이 적혀 있다 — 그때 둘째 이름은 재기동되지 않았을 수 있다. 뉴스 워커는 11-18 14:58 에 다시 띄움(그 전 PID 78575). 틀린 이름이 하나라도 있으면 아무것도 재기동하지 않는다 |
| 2026-11-20 | **웹 zone 기본 = 운영 모드**(빌드 + `next start`, `ZONE_STATIC=per-zone`) · 고치는 zone 만 `web dev <이름>`(목록 `~/.salt-web-dev`) · `web prod [이름]` 으로 되돌림 · `status` 방식 칸 `운영`/`dev`. dev 서버가 zone 마다 2.4GB(투자 zone 22시간 6.6GB) · 고칠 때마다 다섯이 각자 다시 컴파일해 CPU 478%(사용자 "CPU · 램은 고쳐야"). 운영 모드 zone 당 118~124MB · CPU 0%, next-server 합 약 11GB → 649MB. dev 로 띄우면 주요 화면 예열(`WARM` 표 — 첫 방문 /plan 1.73초 → 0.92초). Turbopack 은 vanilla-extract 플러그인이 Next 16 이상에서만 켜 보류. `onDemandEntries` · `webpackMemoryOptimizations` 는 측정상 효과 0(2,458 → 2,452MB)이라 넣지 않음 |
| 2026-11-20 | 셸 web 은 `127.0.0.1:3000` 에만 묶는다(`WEB_HOST`) — 다른 업무 프로젝트 vite 가 `[::1]:3000` 을 잡아 둘이 같이 뜨게. 주소는 `http://127.0.0.1:3000`. 그 프로젝트가 dev 를 다시 띄울 때 3000 을 쓰는 프로세스를 내리는 것으로 보여(오늘 세 번) SALT 셸이 같이 꺼진다 — 그때는 `ops/salt.sh restart web` |
| 2026-11-20 | **셸 웹 3000 → 3100**(사용자 "3000번 회사거 해야해서") — 레지스트리 `devPort` · `apps/web` dev 스크립트 · `PORT` 표 · Server Actions 허용 origin 기본값(`localhost:3100,127.0.0.1:3100`) · BFF `WEB_ORIGINS` 기본값(웹소켓 쿠키 origin) · `SITE_URL` 기본값. 같은 날 넣은 `WEB_HOST` 127.0.0.1 묶기는 빈 표로(겹치는 포트가 없어서). 주소 `http://localhost:3100` |
| 2026-11-20 | `FE-REQ-071` 짝 — `ops/salt.sh` 이름 표 · 포트 · 로그 · 예열에 `web-mobile`(3006, 휴대폰 PWA `/m`) — 웹 zone 이 여섯 |
| 2026-11-25 | **국내 백테스트 게이트가 11-16 부터 영영 닫혀 있었다** — `backfill.sh` 가 "국내 판단 과거 검산 행 0"을 국내 6자리 종목의 `backtest%` 전부로 셌는데, 같은 날 들어간 국내 단타 `backtest_price_only` 1,155행이 걸렸다. 전 종목 일봉은 11-23 · 11-24 `남음 0` 이었지만 국내 장기 백테스트는 0회 → `status` 장기 3종 결함 53/53. 조건을 판단 백테스트 스크립트(`backtest-kr-judgments.ts`)가 쓰고 지우는 범위(`backtest`·`backtest_full` × `kr_stock.long_term.%`)와 같게 — SQL 은 `salt-forecast/ops/kr-backtest-done.sql` 한 곳, 시험 `kr-backtest-done.test.sh` |
| 2026-11-26 | **판단 과거 검산(`signal-skill@1`)을 7일마다** — `backfill.sh` 4번. 등록이 "만기가 실행 시각 전에 온 판단만"이라 실행이 늦을수록 표본이 는데, 11-10 · 11-16 손 실행 뒤 열흘 묵어 코인 장기 피하기가 판단 날 9 < 10 에 머물렀다(3종 결함 10 → 16). 조건은 그 스크립트가 지우고 다시 쓰는 범위의 가장 최근 쓰기가 7일 넘음 — SQL `salt-forecast/ops/signal-skill-stale.sql` 한 곳, 시험 `signal-skill-stale.test.sh` |
