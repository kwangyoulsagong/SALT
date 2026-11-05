# F000 done 전 검사 (`DEV-001`) — 회고

## 잘 된 것
- 지난 지적 기록(메모리 열둘)을 다시 읽고 **셀 수 있는 것 / 없는 것**으로 갈랐다. 셀 수 있는 다섯은 스크립트 · lint 가 센다
- 통과만 보고 끝내지 않고 변이로 실패를 확인했다 — 거기서 `includes` 꼴 선택자가 안 걸리는 것을 찾았다(`ArrayExpression` 은 `MemberExpression` 아래)

## 아쉬운 것
- 첫 실행에서 계획 문서를 슬라이스로 셌다 — 루트 `requirements/specs` 에 슬라이스 아닌 문서(`DESIGN-…` · `OPS-…`)가 섞여 있다는 것을 먼저 보지 않았다

## Action
- 새 결함이 나면 `done-checklist.md` 4절대로 — 먼저 셀 수 있는지 보고 스크립트 · lint 로. 사람 칸은 셀 수 없을 때만
- 코드 리뷰 스킬은 쓰지 않는다(사용자 2026-11-04). 메모리 `feedback-code-review-once` 를 그 결정으로 바꿨다

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- `check-done.mjs` 1번(주인 REQ)이 `.sh` · `.json` · `.yml` 도 센다 — 코드만 세던 때 eslintrc · `run-platform.sh` 주인을 놓쳤다(2026-11-02 · 11-05). 바꾼 즉시 2건(DB-REQ-038 · FE-REQ-044)을 더 찾았다. 웹 lint 규칙 `@repo/fsd/no-client-enum-export` 신설(1절 표 행)
- **Action**: 사람이 또 놓친 종류는 다음에도 스크립트부터 늘린다(이번 확인 2회차가 그랬다)
