---
id: SLICE-F018-PUBLIC-MARKET-GUEST
title: "로그인 없이 시세 보기 — 게스트 토큰 · 국내 공개 · 로그인 칸 유리막"
priority: high
labels: [F018, server, bff, fe, forecast, invest]
created: 2026-11-10
status: done
---

## Summary

사용자 2026-11-10: "주식 보는 건 실시간 기능들은 로그인 안 해도" · "임시 토큰 주면 되지" · "로그인이 필요한 기능들은 다 빼면" · "KIS 토큰은 내 걸 쓰고" · "ai 기능들은 왠만하면 다"(로그인).
결정 `ADR-011`, 기획 `FEATURE-018`, 전 영역 계획 `requirements/specs/in-progress/F018-public-market-guest-global-plan.md`.

> **done 2026-11-10** — `SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070`. 실화면 중 본 장중 504 는 원인까지 고침(`DB-REQ-017` 5회차 · `FC-REQ-018`).

## 판단

1. **게스트 토큰은 사람 경로를 서명에서 못 지난다** — 파생 비밀 + `aud`. 경계 표 테스트
2. **소유자 판정은 전망만** — 국내 시세 · 판단 · 거래 · 관심은 로그인 전체, 시세는 게스트 포함. 기계 검사 `ownerGateScope`
3. **BFF 는 경로를 풀지 않았다** — 검사가 헤더 존재뿐이라 쿠키 순서(사람 → 게스트) 하나로 끝(기획 FR-2 정정)
4. **판정 둘** — 내비 숨김(`isPublicPath`) ≠ 로그인으로 안 보냄(`isGuestReadablePath`)
5. **본 504 는 그 자리에서** — 조건 없는 봉 다시 쓰기(5분마다 12만 행) · 8시간 열린 예측 트랜잭션이 VACUUM 을 막음

## 커밋

| 커밋 | 몫 |
|---|---|
| `369a30a6` | 기획 — `FEATURE-018` · `ADR-011` · 영역 REQ 셋 · `FEATURE-011` §정책 정정 |
| `3013b59f` | 서버 — 게스트 발급 · 읽는 사람 · 국내 소유자 판정 걷기 · 관리 수집 경로 소유자 |
| `3a450fb7` | BFF — 쿠키 순서 · 발급 통과 · 검색 null · 실시간 상한 둘 |
| `69da540d` | 서버 504 5회차 — 봉 upsert 조건 · 캔들 동시 4 · 자동 청소 2% |
| `5d38eb44` | 예측 — 락 직후 커밋 · 작업 시간 상한 |
| `e958e506` | FE — 게스트 발급 · 유리막 · 돌아올 주소 · 결함 둘 |

검증 `requirements/reports/checklists/F018-public-market-guest.md`.
