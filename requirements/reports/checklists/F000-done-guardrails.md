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
| "프론트 판단 상수" lint | 이름으로 갈리지 않는다(후보 25 · 위반 0) — 사람 칸 | 판단 상수에 붙일 표지가 생기면 |

## 2026-11-04 — 남은 것 닫기(사용자 "남은 것 니가 다 해")

- [x] FR-6 `no-render-read` — 프론트 700파일에 돌려 4곳(1곳은 무관한 설정 메시지) → `useRegenerateCoach` 고침 · `EventsCard` · `ForecastFanChart` 는 데이터가 마운트 뒤 브라우저에서만 와서(소유자 전용 조회) 이유 적은 예외. 변이: 나쁜 6줄(토큰 · `useMemo` · `useState` 초기값 · 저장소 · `new Date()` · 훅) 다 걸림, 처리기 · 효과 · 일반 함수 통과. `pnpm lint` 12/12
- [x] CI(`checks.yml`) — 만들어 같은 조건(새 작업 트리)에서 명령을 다 돌려 봤지만 사용자 결정으로 뺐다. 그 과정에서 `check-done` 이 이 브랜치의 주인 REQ 4개(009 · 028 · 038 · 046) 문서 누락을 잡아 채웠다
- [x] 판단 상수 lint — 이름 패턴 조사 25개 전부 정상 값(입력 길이 · 목록 개수 · 칸 높이) → lint 하지 않기로, 사람 칸에 근거와 함께
