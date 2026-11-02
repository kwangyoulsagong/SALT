# 돈 관리 앱 F2 — 앱 내비게이션 — 체크리스트 (루트)

슬라이스 `requirements/specs/in-progress/MONEY-F2-app-navigation-slice.md` · 2026-11-03 · `feat/fe-req-054-app-navigation`(base `b822df43`)

## 1. 커밋

- `1c4c3ee9` feat(core) — 탭 한 벌 · 계측 계산 · 도메인 색. 다른 커밋이 기대는 바탕
- `5a86dafa` feat(ui) — `AppNavigation`(표시만)
- `e0bce695` feat(fe) — zone 공용 레이아웃 연결 · 화면별 프로필 메뉴 삭제. **화면이 바뀌는 커밋은 이것 하나**
- `7b8b1110` refactor(fe) — zone 설정 5개 → 프리셋. 동작 무변경(설정 값 대조)
- `4c234835` feat(ui) — 사용자 지적 뒤 면 글리프 · 기준 레일 실측값
- `f6587a53` fix(fe) — 기존 결함(로그인 화면 비침). 되돌리기가 따로 되게 분리
- 문서 커밋(이 체크리스트 · REQ · 규칙)

## 2. 검증 (최종 HEAD)

| 확인 | 결과 |
|---|---|
| 모노레포 check-types · lint · test · layer-check | 10/10 · 10/10 · core 81 · ui 43 · 차단 16 통과 10 |
| 훅 사후 실행 | 코드 파일 37 전부 통과 |
| zone 5 빌드 · Storybook | 5/5 · 성공 |
| 번들(main 워크트리 대조, HTML 스크립트 gzip) | +2.6~+9.2 KB(`/home` 최대) — 예산 40 안 |
| 실화면 | 5화면 × 5폭 넘침 0 · 앱 웹뷰 내비 0 · 전환 3/3 · 줄인 모션 0/3 · WebKit 일반 이동 오류 0 |
| prerender | 규칙 · 시도 확인, 적중은 자동화에서 막힘(`PrerenderingDisabledByDevTools`) |
| 기존 결함 | 반쪽 세션 재현(전 2/2 비침) → 수정 → 후 0/2 · 새 로그인 307 |
| 임시 사용자 | 2회 만들고 지움 — 계정 5 유지 |

세부는 `salt-microFe/requirements/reports/checklists/FE-REQ-054.md`.

## 3. 걸린 기존 REQ

| REQ | 무엇 |
|---|---|
| `FE-REQ-005` · `007` · `008` · `009` · `010` · `026` · `043` · `044` · `052` · `053` · `055` | 파일 걸침(프리셋 · 레이아웃 head · 프로필 메뉴 삭제 · 문구 · 토큰 추가 · 주석) — Changelog · 체크리스트 · 회고 |
| `FE-REQ-011` · `013` | 기존 결함 수정(로그인 판단) · `013` 은 PERF 번들 줄도 |
| `FE-REQ-029` | PERF 번들 줄(투자 zone) |
| `FE-REQ-030` | 메모 — 앱 탭 4개, F006 3탭은 투자 zone 안 탭으로 |
| `FE-REQ-047` · `051` | FR-1 정정(도메인 내비 = 왼쪽 레일) · 로고 자리(`brand` 칸) |
| `FE-REQ-056` · `057` · `058` | 넘겨줄 몫(`readyBy` · 레이아웃 · 전환) |
| `RN-REQ-032` | FR-2 이름 정정 · 한 벌 위치 |
| `ADR-005` · `FEATURE-015` | 규칙 6 이름 · 이력 · FR-8 상태 |
| 규칙 | `microfrontend.md` §0 · §2-6 · §5 · `screen-desktop.md` §1 · `fsd-pages.md` · `rn-architecture.md` §4 · `screen-mobile.md` §4 · `layered-architecture.md` §4 · §8 · 영역 `CLAUDE.md` · 디자인 시스템 인덱스 2 |

## 4. 짝 영역

BFF · 서버 · 예측 — 변경 없음(계약 무변경). 미검증 · 범위 밖은 슬라이스 문서 표와 같다.
