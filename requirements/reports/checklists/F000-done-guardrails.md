# F000 done 전 검사 (`DEV-001`) — 체크리스트

- [x] FR-1 `check-done.mjs` — 로고 브랜치(`feat/fe-req-051-047-d1-logo-shell`)에서 통과(주인 REQ 3 · 바뀐 파일 65). 처음엔 계획 문서(`DESIGN-…`)를 슬라이스로 세어 2건 잘못 실패 → `*-slice.md` 만 세게 고침
- [x] FR-1 변이 확인(이 브랜치 작업 트리, 사본으로 되돌림) — 코드 파일 머리 REQ 를 문서 없이 건드림 · 외부 서비스 이름 한 줄 · 206줄 규칙 문서 → **3건 다 실패**, exit 1. 되돌린 뒤 깨끗
- [x] FR-2 목록 파일을 `--git-common-dir` 에서 — 별도 작업 트리에서 같은 목록을 읽음
- [x] FR-3 서버 lint 변이 — `=== "P2002"` · `case "P2025"` · `["P2034"].includes` 3건 error, `=== "KR_STOCK_DISABLED"`(도메인 사유 코드)는 통과. `salt-server` 전체 `npx eslint .` 0건
- [x] FR-4 `done-checklist.md` 200줄 이내
- [x] FR-5 루트 `CLAUDE.md` 표 행 · deliver 3 · 예측 pipeline 1 에 같은 단락
- [x] 이 브랜치에 `check-done.mjs` 통과(아래 커밋 전 실행)

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 프론트 "렌더 중 토큰 · 시각" · "프론트 판단 상수" lint | 정적 판정 불가 — 체크리스트 사람 칸 | 판정할 수 있는 표지(파일 머리 `"use client"` 등)로 셀 방법이 생기면 |
| CI 에서 자동 실행 | CI 가 없다 | `OPS-001` |
| 아이콘 테스트 행 | 로고 브랜치에 있다 | `FE-REQ-051` 브랜치 머지 |
