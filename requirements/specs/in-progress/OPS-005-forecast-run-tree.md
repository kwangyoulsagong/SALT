---
id: OPS-005
title: "예측 배치는 머지된 main 에 고정한 실행 트리에서 돈다 — 개발 트리의 브랜치 · 커밋 안 한 수정이 예측에 닿지 않게"
priority: high
labels: [ops, local, forecast, F017]
created: 2026-11-17
status: in-progress (FR-1~6 구현 2026-11-17 — FR-7 머지 뒤 첫 자동 맞춤 실측 남음)
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
| FR-4 | 매시 live 끝(재생 뒤)에 `salt-forecast/ops/sync-run.sh`: 실행 트리 리포트(새 · 바뀐 것) → 개발 트리 · origin/main 따라가기 · 다른 예측 배치가 돌면 미룸 · 예측 코드가 바뀌었으면 단타 시험을 바로 다시 적합 | done — 시험 `sync-run.test.sh` 9/9 · 변이 2/2 |
| FR-5 | `ops/salt.sh status` 에 실행 트리 줄 — origin/main 보다 뒤 · 손댄 소스면 ✗. `ops/salt.sh sync` 로 지금 맞춤 | done |
| FR-6 | 서버 `forecast-runner` 끔(`salt-server/.env` `FORECAST_RUNNER_ENABLED=false`, 로컬 설정) — launchd `forecast-daily` 가 같은 일을 한다 | done(서버 재시작) |
| FR-7 | 머지 뒤 첫 자동 맞춤 실측 — live 로그 "실행 트리 a → b" · 예측 코드 바뀐 머지면 "단타 시험 다시 적합" 뒤 다음 회차 live 행 > 0 | 머지 뒤 |

가드 자체(디스크 대조 · 실시간에도)는 `FC-REQ-028`(2026-11-17).

## Acceptance Criteria

- [x] 지난밤 원인 실측 — reflog(17:31 브랜치 전환 · 커밋 시각) · 적합 커밋 · `git diff` 경로 · main 밤새 코드 차이 0
- [x] 변경이 숫자를 안 바꿨다는 근거 — `7d2fc278` 코드와 HEAD 코드로 18 · 00 · 06시 재계산 해시 같음 · 18시 저장 실시간 147행 값 같음
- [x] 지난밤 복구 — `754257d9`(밤새 main, 적합 커밋과 코드 차이 0) 트리로 재생 14시각 2,022행 · 18~09시 빈 시각 0
- [x] 실행 트리에서 live 한 회차 — 채점 1,203 · 늦은 예측 버림 · 재생 대상 0
- [x] `sync-run.test.sh` 9/9 · 변이(바쁨 확인 제거 · 코드 변경 판정 제거) 둘 다 잡힘
- [ ] FR-7

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-11-17 | 신규 · FR-1~6 구현(`fix/forecast-run-tree`) |
