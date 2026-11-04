# F000 슬라이스 — done 전 검사 (`DEV-001`)

> 상태: **done** (2026-11-04) · 브랜치 `chore/review-guardrails` · 영역: 루트 하네스 + `salt-server` lint 설정 한 줄 · 화면 · API 계약 변경 없음

## 왜

사용자 2026-11-04: "우리가 이때까지 문제 되던 것들 발생 안 하게" · "코드리뷰는 안 하는 걸로 이제" · "문제가 되면 애초에 구현 자체가 잘못된 거잖아".
지금까지 되풀이된 결함은 거의 다 규칙 문서 · 메모리에 **이미 적혀 있었는데** 다시 났다(파이프라인 누락 10번 · 오류 코드 분기 · 외부 서비스 이름 …).
코드가 막는 것(레이어 훅 · `axios` lint · zone 을 넘는 `<Link>` lint)은 다시 난 적이 없다. 코드 리뷰는 결함을 늦게 찾고(구현이 이미 틀린 뒤) 고친 코드가 다음 차 퇴행을 만들었다(S1b 12회).

## DEV-001 요구

| FR | 내용 | 구현 |
|---|---|---|
| FR-1 | 기계로 셀 수 있는 누락은 스크립트가 센다 — 주인 REQ 의 스펙 · 체크리스트 · 회고, done 으로 옮긴 REQ 문서, 루트 슬라이스 3종, 마스터 인덱스, 규칙 200줄, 외부 서비스 이름 | `scripts/check-done.mjs` |
| FR-2 | 외부 서비스 이름 목록은 레포에 두지 않는다(목록 자체가 언급이 된다) | `.git/info/reference-brands`(공용 git 디렉터리 — 작업 트리를 따로 열어도 같은 목록) · `SALT_REFERENCE_BRANDS` |
| FR-3 | DB 오류 코드로 흐름을 가르는 코드를 lint 가 막는다 | `salt-server/eslint.config.mjs` `no-restricted-syntax` 3꼴(비교 · `switch` · `[…].includes`) |
| FR-4 | 셀 수 없는 것은 짧은 체크리스트 — 구현 전 · done 전, 항목마다 언제 터졌나 | `.claude/rules/done-checklist.md`(200줄 이내) |
| FR-5 | 영역 파이프라인이 done 전에 이 검사를 부른다 · 코드 리뷰 스킬은 쓰지 않는다 | 루트 `CLAUDE.md` 표 · 영역 deliver(웹 · BFF · 서버) · 예측 pipeline 스킬 |
| FR-6 | 렌더 중 토큰 · 지금 시각 · 난수 · 브라우저 저장소 읽기를 웹 lint 가 막는다 | `@repo/fsd/no-render-read` — zone 앱 · 도메인 패키지 9곳. 기존 걸린 3곳: 1곳 고침(`useRegenerateCoach`), 2곳은 브라우저에서만 그려져 이유 적은 예외(`EventsCard` · `ForecastFanChart`) |

원본 → 생성물 갈라짐(아이콘)은 로고 브랜치의 `brandIcons.test.ts`(`FE-REQ-051`)가 막는다 — 그 브랜치가 머지되면 체크리스트 1절 표가 맞아진다.

## 범위 밖

- "프론트 판단 상수" lint — 이름으로 찾은 상수 25개가 전부 입력 길이 · 목록 개수 · 칸 높이였다(위반 0). 이름으로는 판단 상수와 갈리지 않아 체크리스트 2절(사람)로 둔다
- CI — 만들었다가 뺐다(사용자 2026-11-04 "빼"). 검사는 영역 deliver 단계에서 부른다
