---
id: SLICE-OPS-002-NEW-MAC-SETUP
title: "새 맥 이전 — 폴더별 런타임 고정 · launchd node 경로 · 네이티브 RabbitMQ · Compose 기동 결함"
priority: high
labels: [OPS-002, ops, platform, forecast, slice]
created: 2026-11-16
status: done
---

## Summary

사용자 2026-11-16: "새 맥북으로 와서 데이터들이 하나도 없을거야 db등 머든 수집기랑 env등" · "여기도 파트리지시스템즈 내부 폴더 처럼 이폴더만 node 고정" ·
"배터리 빨리 닳는 이유" → "brew rabbit mq ㄱㄱ" · "그것도 되게 해주면돼"(Compose 전체 스택).
옛 맥 없이 새로 시작(DB 빈 상태 · env 새로). 깔면서 드러난 결함 넷을 코드로 막았다.

> **done 2026-11-16** — 검증 `requirements/reports/checklists/OPS-002-new-mac-setup.md`.

## 범위

| REQ | 몫 |
|---|---|
| `OPS-002` | `ops/salt.sh` — plist 의 node 를 루트 `.node-version` 으로 · 실제 경로로(:A) |
| `SRV-REQ-043` | `salt-platform/compose.yaml` — identity env 3개 전달 · 호스트 포트 env 화(기본값 그대로) |
| `SRV-REQ-045` | `salt-platform/ops/run-platform.sh` — 네이티브 RabbitMQ(brew)가 있으면 그것을 켠다 |
| `SRV-REQ-048` | `ops/salt.sh` 머리 주석이 가리켜 걸림(동작은 `OPS-002` 몫) |
| — | 루트 `.node-version`(22.12.0) · `salt-forecast/.python-version`(3.12) |

## 판단

1. **런타임은 폴더가 정한다** — fnm `--use-on-cd` 와 uv 가 읽는 버전 파일. 사람 셸 · launchd · 다른 프로젝트(기본 node 26)가 같은 답을 낸다
2. **launchd 에는 실제 경로** — fnm 의 `command -v node` 는 셸마다 사라지는 multishell 경로다. 부른 셸 node 를 그대로 박던 것이 서버 · BFF 를 node 26 으로 띄웠다
3. **Python 3.12** — `requires-python >=3.12` 의 하한. uv 가 고른 3.15 에서 polars 1.44 의 `str.*` 가 `None` 을 돌려 `backfill_whale` 이 매번 죽었다
4. **RabbitMQ 는 brew(같은 55672)** — Docker VM 이 RabbitMQ 하나에 CPU 30%. 포트를 같게 두어 platform 설정 · 코드 무변경, 없으면 예전대로 Compose
5. **Compose 호스트 포트는 env, 기본값은 그대로** — 다른 맥 · 문서 무영향. 이 맥만 `.env` 로 55673 · 15673 · 4011

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~FRED 수집 시간대 결함(`end = now.date()` 가 UTC — 시카고 날짜보다 앞서면 400, 겨울 KST 09~15시)~~ | — | **닫힘 2026-11-16** `OPS-002`(PR #186) — 미국 중부 날짜 |
| 백필 · 백테스트 재실행 | 데이터 작업(코드 무변경). 국내 전 종목 5년은 여러 밤 | 국내 백필 끝 뒤 |
| 셸 웹 3000 실화면 | 3000 을 다른 프로젝트가 쓴다 | 3000 이 비면 |

## 후속 — 잠드는 맥(2026-11-16)

사용자: 맥은 평일 업무 시간에만 켠다 · 클라우드 배포는 하지 않고 한계로 둔다("포폴용"). 그래서 잠든 동안 빈 것을 깨어나서 메운다.

| 무엇 | 어디 |
|---|---|
| 백필 상시(launchd `forecast-backfill` 매시) · FRED 날짜 | `OPS-002` (PR #186) |
| 업비트 증분을 종목별 마지막 봉부터(상한 30일) | `OPS-002` |
| 뉴스 빈 날을 Google 뉴스 날짜 검색으로(최대 14일) | `FC-REQ-016` |
| 남는 한계 — 영어 매체 RSS · 유의 종목 · 도미넌스 스냅샷 · 라이브 예측(켜진 시간대만 쌓임) · 서버 국내 밤 작업(전 종목 일봉 5년 · 5분봉 1년 백필, catchUp 없음) | 알려진 한계 |

