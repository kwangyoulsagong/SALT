---
id: OPS-005
title: "예측 배치는 머지된 main 에 고정한 실행 트리에서 돈다 — 개발 트리의 브랜치 · 커밋 안 한 수정이 예측에 닿지 않게"
priority: high
labels: [ops, local, forecast, F017]
created: 2026-11-17
status: done (2026-11-17 — FR-1~7, PR #190 머지 뒤 실측)
source: 사용자 "출근 했어 채워지고 있어?" → "딥리서치하고 원인인 무엇인지 제대로 확인하고 고쳐야지" → "베스트 케이스로 해줘" (2026-11-17)
---

## Summary

2026-11-16 밤 단타 동결 재생(`short-direction@5`)이 깨어날 때마다 `skipped_code_changed 42 · rows 0` 이었다.
launchd 예측 배치가 **개발 트리**에서 돌았고, 17:31 기능 브랜치로 바꾼 뒤 온톨로지 커밋이 단타 작업이 불러오는 공용 `store/tables.py` · `store/bulk.py` 를
고쳐 가드(적합 커밋 ↔ HEAD)가 규칙대로 막았다. 밤새 main 의 예측 코드는 그대로였다(`7d2fc278..754257d9` 차이 0).
가드는 맞았고 **돌린 자리가 틀렸다** — "지금 도는 코드" = 그때 체크아웃한 브랜치 · 커밋 안 한 수정. #188(머지 커밋에 막힘)에 이어 같은 종류 두 번째.

같은 뿌리의 다른 구멍: 실시간 행엔 다른 코드로 계산한 값에 적합 커밋 이름표가 붙었고(가드 없음), 사전등록 TOML 도 개발 트리에서 읽어
머지 안 된 등록이 DB 에 들어갈 수 있었고, 서버 `forecast-runner` 가 개발 트리 `daily.sh` 를 매시 또 걸었다.

## FR

| FR | 내용 | 상태 |
|---|---|---|
| FR-1 | 실행 트리 `~/.salt-run` — `git worktree --detach origin/main`. `.env` 는 개발 트리 것을 가리킨다. `ops/salt.sh up` 이 없으면 만든다 | done 2026-11-17 |
| FR-2 | launchd 예측 넷(`forecast` · `-live` · `-intraday` · `-backfill`)은 실행 트리 스크립트 + `SALT_DEV_ROOT`. 다른 서비스 plist 는 그대로 | done |
| FR-3 | `up` 은 plist 가 만들 것과 다르면 다시 올린다 — 안 그러면 옛 경로로 계속 돈다 | done |
| FR-4 | 매시 live 끝(재생 뒤)에 `salt-forecast/ops/sync-run.sh`: 실행 트리 리포트(새 · 바뀐 것) → 개발 트리 · origin/main 따라가기 · **일일 · 장중 배치**가 돌면 미룸(백필은 기다리지 않는다 — 5분봉 메우기 평균 4시간 · 최대 20시간, 11-17 실측) · 예측 코드가 바뀌었으면 단타 시험을 바로 다시 적합 · fetch 는 프롬프트 없이(`GIT_TERMINAL_PROMPT=0`) | done — 시험 `sync-run.test.sh` 11/11 · 변이 4/4 |
| FR-5 | `ops/salt.sh status` 에 실행 트리 줄 — origin/main 보다 뒤 · 손댄 소스면 ✗. `ops/salt.sh sync` 로 지금 맞춤 — 개발 트리의 동기화 스크립트를 `SALT_RUN_ROOT` 로 불러 실행 트리에 그 파일이 아직 없는 첫 맞춤(머지 직후)도 된다 | done |
| FR-6 | 서버 `forecast-runner` 끔(`salt-server/.env` `FORECAST_RUNNER_ENABLED=false`, 로컬 설정) — launchd `forecast-daily` 가 같은 일을 한다 | done(서버 재시작) |
| FR-7 | 머지 뒤 첫 자동 맞춤 실측 — live 로그 "실행 트리 a → b" · 예측 코드 바뀐 머지면 "단타 시험 다시 적합" 뒤 다음 회차 live 행 > 0 | done 2026-11-17 — 첫 맞춤 `0a0d2369 → 28d5f3af`(예측 코드 바뀜 1) · 다시 적합 91초 · 10:02 회차 `skipped_code_changed 0` · 코인 141행 `+28d5f3af` · live 끝 자동 동기화 실행(실행 트리 FETCH_HEAD 10:02:55, 맞출 것 없어 조용히 끝) |

가드 자체(디스크 대조 · 실시간에도)는 `FC-REQ-028`(2026-11-17).

## Acceptance Criteria

- [x] 지난밤 원인 실측 — reflog(17:31 브랜치 전환 · 커밋 시각) · 적합 커밋 · `git diff` 경로 · main 밤새 코드 차이 0
- [x] 변경이 숫자를 안 바꿨다는 근거 — `7d2fc278` 코드와 HEAD 코드로 18 · 00 · 06시 재계산 해시 같음 · 18시 저장 실시간 147행 값 같음
- [x] 지난밤 복구 — `754257d9`(밤새 main, 적합 커밋과 코드 차이 0) 트리로 재생 14시각 2,022행 · 18~09시 빈 시각 0
- [x] 실행 트리에서 live 한 회차 — 채점 1,203 · 늦은 예측 버림 · 재생 대상 0
- [x] `sync-run.test.sh` 11/11 · 변이 4/4(바쁨 확인 제거 · 백필도 기다림 · 코드 변경 판정 제거 · `SALT_RUN_ROOT` 무시)
- [x] FR-7 — 위 표

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-17 | 신규 · FR-1~6 구현(`fix/forecast-run-tree`) |
| 2026-11-17 | 검증 2회차(사용자 "버그 없는지 파이프라인 다했는지") — 결함 셋 고침: 백필(최대 20시간)을 기다려 영영 못 맞춤 · 첫 맞춤 때 실행 트리에 스크립트 없음 · fetch 자격 증명 프롬프트 대기. 사용자 "3000 켜도돼" — 웹 3000 켬 |
| 2026-11-17 | in-progress → done — PR #190 머지 뒤 FR-7 실측 |
