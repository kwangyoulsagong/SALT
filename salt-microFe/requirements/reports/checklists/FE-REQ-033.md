# FE-REQ-033 checklists

## 2026-11-19 — FR 대조 · 실측 · 거래 시트 지연 로딩 (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- FR-74 — `PositionOverview.tsx` 시트 dynamic `ssr:false` · 첫 진입 JS 309.9 → 301.3 kB(로그인 실측) · 시트 17.7 kB 누를 때 · 열림 · Esc 닫힘 — pass
- FR-17 · 27 · 33 · 34 — 운영 빌드 Chrome 1440: 답 받는 동안 긴 프레임 0 · 구분선 138프레임 16.7ms · 질문 → 첫 문장 p95 38ms — pass
- FR-10 · 12 — memo 넣고 잰 뒤 뺌(측정 없이 memo 금지). memo 없이 긴 프레임 0 — 대체
- 웹 `pnpm check-types` · `lint` · `test` · `test:layer-check` · 투자 zone 운영 빌드 — pass
- 범위 이동: FR-60 관측 → `OPS-001` · 코치 첫 페인트 400ms(LCP 496~524ms 는 다른 지표) → `FE-REQ-047`
- 미충족: 없음(대체 · 범위 이동은 스펙 정리 절 표)
