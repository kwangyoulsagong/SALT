---
id: SLICE-MONEY-F0-DOMAIN-ZONES
title: "돈 관리 앱 F0 — zone = 도메인: 레지스트리 5 zone · rewrites 생성 · lint 도메인 축 · web-tax 삭제"
priority: high
labels: [F015, architecture, fe, slice, microfrontend]
created: 2026-11-02
status: done
---

## Summary

사용자 "새 브랜치 파고 다음꺼 파이프라인 진행" — 마스터 인덱스 §4-1 순위 3 넷째 줄(F008 슬라이스 24 2단계)은 공시 수집 `FC-REQ-026`(온톨로지 `FC-REQ-022` 뒤)이 막고 있어
3a 첫 줄 `FE-REQ-052`(F0). 계획 `MONEY-domains-global-plan.md` 의 `ADR-005 ─ FE-052(F0) ─ FE-053 …` 첫 칸이다. 영역 하나(FE)짜리.

`ADR-005` 를 **실행되는 규칙**으로 만들었다. 화면은 옮기지 않았다 — 그것은 `FE-REQ-053`(투자) · `FE-REQ-056`(저축).

## 범위

| REQ | FR | 내용 |
|---|---|---|
| `FE-REQ-052` | FR-1~8 | 규칙 · 레지스트리 5 zone · rewrites 생성 · 도메인 축 · zone lint 레지스트리 전체 · `web-tax` 삭제 · 빈 zone 4 · 문서 — **done** |
| `FE-REQ-007` | FR-2 · 3 · 33 · 수용 기준 | 세금 zone 행 그 자리 정정 |
| `FE-REQ-009` | FR-20~26 | 같은 규칙 표에 도메인 축 · 훅 테스트 8 → 12 |
| `FE-REQ-008` · `035` · `044` | — | 파일만 걸침(삭제한 web-tax 레이아웃 · 같은 eslintrc · 같은 규칙 표의 다른 줄) |
| `FE-REQ-053` · `056` | — | 화면을 옮길 때 레지스트리 `hostedIn` 을 바꾸는 몫을 Changelog 에 |
| `ADR-002` | §3 · §5 | `web-tax` 열린 항목 닫음 |

## 판단 — 리뷰가 볼 곳

1. **`hostedIn` 칸** — 목표(경로 주인 zone)와 지금(그 화면을 서비스하는 앱)을 나눴다. 이게 없으면 F0 에서 셸 안 `<Link href="/investments">` 가 전부 lint 실패이거나, 규칙을 F1 까지 미뤄야 한다
2. **rewrites 경로를 `fallback` 으로** — `afterFiles` 는 동적 라우트보다 먼저라 `/investments/[symbol]` 을 빈 zone 이 가로챈다. `fallback` 이면 셸에 화면이 있는 동안 셸이 받는다. 실측 `/investments/BTC` 셸 200 · `/coach` 투자 zone 404
3. **레지스트리 데이터를 JSON 하나로** — FR-5 의 "생성본" 대신 생성 단계 없이 TS · CommonJS 가 같은 파일을 읽고 계산 대조 테스트(`registry.test.ts`)로 묶었다. 생성물은 다시 손으로 고쳐지는 사본이 된다
4. **zone id 를 도메인 이름으로**(`default`/`tax` → `shell` · `invest` · `savings` · `household` · `tips`) — BFF 경로 · 서버 서비스 · RN 번들과 같은 이름(`ADR-005` §1)

## 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 투자 · 저축 화면을 zone 으로 | 이 슬라이스는 규칙 · 골격 | `FE-REQ-053` · `FE-REQ-056` |
| `domain-*` 안 FSD 레이어 축 · ESLint 설정 | 패키지가 없다 | `FE-REQ-053` FR-1 |
| `AppChrome` · prerender · 문서 간 전환 | 별도 REQ | `FE-REQ-054` · `FE-REQ-055` |
| `ops/salt.sh` zone 앱 기동 | 빈 골격 | `FE-REQ-053` |
| 운영 한 origin 경로 라우팅 | 배포 환경 미착수 | `OPS-001` |
