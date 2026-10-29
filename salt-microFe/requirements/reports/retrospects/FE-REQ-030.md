---
id: FE-REQ-030
spec: ../../specs/in-progress/FE-REQ-030-F006-UI.md
checklist: ../checklists/FE-REQ-030.md
title: F006 웹 UI — FR-3 /tax 링크 제거 회고
status: 부분 완료 (FR-3)
written: 2026-10-27
---

루트 회고: `requirements/reports/retrospects/F000-dormant-410.md`.

- ADR-002(2026-09-21)가 링크 제거를 이 REQ 에 걸어 두고 F006 착수를 기다리게 했다 — 한 줄 제거가 한 달 남았다.
  큰 REQ 안의 작은 정리는 착수를 기다리지 말고 정리 슬라이스로 먼저 닫는다
- zone(`apps/web-tax`)은 아키텍처 결정이라 건드리지 않았다. 링크가 없어지면서 zone 은 **들어갈 길이 없는 자리표시**가 됐다 — Q1 결정 근거로 남긴다

## Action

- Q1(zone 존속) 결정 때 `CrossZoneLink` 소비처 0 을 같이 본다

## 2026-10-29 REQ 전수 조사

- 현재 상태를 말하는 문장이 뒤 슬라이스를 따라가지 못했다. Action: 슬라이스를 닫을 때 그 결과가 바꾸는 다른 REQ 의 본문 · 범위 밖 · 수용 기준을 grep 한다
