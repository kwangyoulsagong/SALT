---
id: FE-REQ-030
feature: F006
area: fe
kind: UI
title: "F006 코치 대화 & 3탭 IA — 웹 UI 정의 (3탭 · 홈 5블록 · 대화 · PC 이동식 격자)"
priority: critical
labels: [fe, ui, fsd, ia, conversation, movable-grid, a11y]
created: 2026-09-09
---

## Summary

**IA를 3탭으로 확정하고 대화를 제품의 중심에 놓는다.** PC는 탭이 아니라 `MovableGrid`로 여러 패널을 동시에 본다.

## FSD 배치

| 레이어 | 슬라이스 | 컴포넌트 |
|---|---|---|
| `pages` | `home` · `coach` · `assets` | 3탭 |
| `widgets` | `home-briefing` | 5블록 + `BlockBoundary` |
| `widgets` | `coach-console` | 대화 + 추천 카드 + 성적표 |
| `widgets` | `asset-workspace` | 세그먼트 3(포지션/청구서/세금 요약) |
| `widgets` | `pc-panel-grid` | `MovableGrid` 배치 |
| `features` | `ask-coach` | 메시지 전송 + SSE 구독 |
| `features` | `arrange-panels` | 격자 배치 변경·저장 |
| `entities` | `coach` | `ChatBubble` 래퍼 · `RecommendationCard`(F004 재사용) · `SuggestedQuestionChips` |
| `entities` | `portfolio`·`plan`·`tax`·`invoice` | 각 블록 표시 컴포넌트 |
| `shared` | `ui` | `BlockBoundary` |

## 3탭 IA

| 탭 | 경로 | 내용 |
|---|---|---|
| 홈 | `/` | `home-briefing` 5블록 (읽기 전용) |
| 코치 | `/coach` | `coach-console` — 대화가 중심 |
| 자산 | `/assets` | `asset-workspace` 세그먼트 3 |

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-1 | **탭이 정확히 3개**다. 4개로 늘리지 않는다 | Must |
| FR-2 | 자산 탭 세그먼트 3개: `포지션` / `청구서` / `세금`(요약) | Must |
| FR-3 | 세금 상세는 **별도 zone(`/tax`)** 이다. 진입 링크는 **`<a>`** | Must |
| FR-4 | 탭바에 `role="tablist"` + `aria-current`. 터치 타깃 44×44 | Must |
| FR-5 | 어떤 블록을 눌러도 해당 탭으로 이동한다. **홈에서 끝나는 액션이 없다** | Must |

## 홈 5블록

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-10 | **순서 고정**: ① 총자산 ② 이번 주 적립 ③ AI 추천 ④ 세금 D-Day ⑤ 청구서 한 줄. **설정 없음** | Must |
| FR-11 | **375×667에서 스크롤 전 ①②③이 보인다** | Must |
| FR-12 | 블록마다 `BlockBoundary`(Suspense + error boundary) | Must |
| FR-13 | 블록 하나 실패 시 **그 블록만** "지금 불러올 수 없습니다" + 재시도 | Must |
| FR-14 | **금액 블록 실패 시 `0`을 표시하지 않는다** | Must |
| FR-15 | 총자산에 **환율 기준 툴팁**: "현재 환율 기준(세금 계산은 결제일 환율)" | Must |
| FR-16 | AI 추천 블록에 **3종 세트 게이트**가 적용된다. 미충족이면 "표시할 추천이 없습니다" | Must |
| FR-17 | **홈은 읽기 전용.** 적립 완료 체크·피드백 같은 mutation을 두지 않는다 | Must |
| FR-18 | 스크롤 아래에 `보유 5종` 요약과 `알림 2건` | Should |
| FR-19 | 온보딩 미완료면 **온보딩 카드 1개**만. 블록마다 중복 안내 0건 | Must |
| FR-20 | 스켈레톤 높이 = 실제 블록 높이 | Must |
| FR-21 | **변경 금지 목록을 3탭 안에 배치한다.** 목표 진행 카드·`AnalysisGraph`·`TipsApp`은 **삭제하지 않는다** — 홈 5블록 아래 또는 자산 탭에 둔다 | Must |

## 코치 대화 — 제품의 중심

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | `ChatBubble` + `TextArea autoResize` + `Chip`(추천 질문) + `Spinner` | Must |
| FR-31 | **첫 메시지는 오늘의 브리핑 카드**다. 빈 화면으로 시작하지 않는다 — 무엇을 물어야 할지 모르는 것이 대화형 UI의 최대 이탈 원인이다 | Must |
| FR-32 | **추천 질문 Chip 4개**: "지금 팔아야 하나?" · "이번 주 얼마 넣을까?" · "세금 언제까지?" · "내가 뭘 잘못했나?" — SALT의 결정 네 개와 일치 | Must |
| FR-33 | 답변이 **토큰 단위로 흐른다**(SSE). 스트리밍 중 `ChatBubble streaming` + 점 세 개 | Must |
| FR-34 | 대화 목록에 **`role="log"`** 를 둔다 | Must |
| FR-35 | 답변 안에 **추천 카드**가 붙는다. F004의 `RecommendationCard`를 **재사용**한다 | Must |
| FR-36 | **카드에 3종 세트 게이트가 적용**된다. 미충족이면 카드 없이 텍스트만 | Must |
| FR-37 | LLM 실패 시 `fallbackText` + **`규칙 기반 설명` 배지** | Must |
| FR-38 | **AI 생성물을 `colors.ai.*` + `Badge tone="ai"`** 로 표시하고 생성 시각을 붙인다 | Must |
| FR-39 | 대화 히스토리를 **역순 페이징**으로 위로 불러온다 | Must |
| FR-40 | 전송 실패 시 **입력을 보존**하고 재시도 버튼 | Must |
| FR-41 | 스트리밍 중 **취소 버튼** | Must |
| FR-42 | **면책 문구가 답변에 항상 붙는다** | Must |
| FR-43 | 입력창은 `TextArea autoResize` + `maxHeight`. 긴 질문도 쓸 수 있다 | Must |
| FR-44 | 전송은 Enter(Shift+Enter 줄바꿈). 모바일 웹에서는 버튼 | Should |

## PC 이동식 격자

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | PC(≥1280px)에서 `MovableGrid`로 패널을 동시에 배치한다 | Must |
| FR-51 | 기본 배치: **좌 코치 대화 / 우상 추천 카드 / 우하 포지션·세금** | Must |
| FR-52 | 패널 머리말을 끌어 이동, 구분선을 끌어 크기 조절 | Must |
| FR-53 | 구분선에 `role="separator"` + **화살표 키 조절** | Must |
| FR-54 | **칸 이동이 포인터 전용이므로 `movePanel`을 메뉴로 노출**한다(키보드 대체 수단) | Must |
| FR-55 | 배치를 저장한다(`PUT /api/app/panel-layout`). **저장 실패해도 기본 배치로 동작**한다 | Should |
| FR-56 | `MovableGrid`는 **`ssr: false`** 로 마운트한다 | Must |
| FR-57 | 1280px 미만에서는 격자를 쓰지 않고 3탭으로 동작한다 | Must |
| FR-58 | 격자 안에 들어가는 것은 **위젯**이다. `pc-panel-grid`가 위젯을 import하면 cross-slice이므로 **`pages`가 children으로 주입**한다 | Must |

## 온보딩 3스텝

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-60 | ① 초대 코드 ② 계좌 연결 ③ 월 적립액. **그 외 질문 없음**(F000 FE-REQ-010과 공유) | Must |
| FR-61 | 온보딩 미완료면 홈 대신 온보딩 카드 | Must |

## UX 상태

- **Loading**: 블록별 스켈레톤. 총자산은 마지막 캐시를 회색으로 먼저
- **Empty (온보딩 미완료)**: 온보딩 카드 1개
- **Empty (대화 없음)**: FR-31 브리핑 카드 + FR-32 Chip. **빈 입력창만 0건**
- **Partial**: 블록별 "지금 불러올 수 없습니다" + 재시도
- **Blocked (게이트)**: "표시할 추천이 없습니다" + 사유
- **Degraded (LLM 실패)**: `fallbackText` + 배지
- **Error (전체 실패)**: 마지막 성공 응답 + 갱신 실패 배너
- **Optimistic update**: **없음**(홈은 읽기 전용, 대화는 서버 응답이 내용)

## 접근성

| ID | 요구사항 |
|---|---|
| FR-70 | 탭바 `role="tablist"` + `aria-current`. 터치 타깃 44×44 |
| FR-71 | 총자산 큰 숫자에 `aria-label` |
| FR-72 | 손익 부호를 색 + `+`/`−` 문자 |
| FR-73 | 대화 목록에 `role="log"`. **스트리밍 중 매 토큰 낭독하지 않는다** — 완료 시에만 알린다 |
| FR-74 | 스트리밍 중 `aria-busy` |
| FR-75 | 구분선 `role="separator"` + 화살표 키 |
| FR-76 | 격자 이동의 키보드 대체 수단(FR-54) |
| FR-77 | 늦게 오는 블록에 `aria-busy` |

## Acceptance Criteria

- [ ] **탭이 정확히 3개다**
- [ ] 자산 탭 세그먼트가 3개다
- [ ] 세금 진입 링크가 `<a>`다
- [ ] 탭바에 `role="tablist"` + `aria-current`가 있다
- [ ] **홈 블록 순서가 고정이고 설정 항목이 0건이다**
- [ ] **375×667 스크롤 전에 총자산·적립·추천이 보인다**
- [ ] 블록 하나 실패 시 그것만 에러이고 나머지 4개가 정상이다
- [ ] 금액 블록 실패 시 `0`이 0건이다
- [ ] 총자산에 환율 기준 툴팁이 있다
- [ ] **AI 추천 블록에 게이트가 적용된다**
- [ ] **홈에 mutation 호출이 0건이다**
- [ ] 온보딩 미완료 시 카드 1개만 나온다
- [ ] 스켈레톤 높이가 실제와 같다 (CLS 측정)
- [ ] **`TipsApp`·목표 카드·`AnalysisGraph`가 삭제되지 않고 3탭 안에 있다**
- [ ] 대화 첫 진입에 브리핑 카드 + Chip 4개가 있다 (**빈 입력창만 0건**)
- [ ] 답변이 토큰 단위로 흐르고 `streaming` 표시가 있다
- [ ] 대화 목록에 `role="log"`가 있다
- [ ] 답변 안 추천 카드가 F004 컴포넌트를 재사용한다
- [ ] **카드에 게이트가 적용되고 미충족 시 텍스트만 나온다**
- [ ] LLM 실패 시 `fallbackText` + 배지가 나온다
- [ ] AI 생성물이 `colors.ai.*` + `Badge tone="ai"` + 생성 시각으로 구분된다
- [ ] 히스토리가 역순 페이징으로 불러와진다
- [ ] 전송 실패 시 입력이 보존된다
- [ ] 스트리밍 중 취소 버튼이 있다
- [ ] **면책이 답변에 항상 붙는다**
- [ ] PC에서 `MovableGrid`로 패널을 이동·조절할 수 있다
- [ ] 구분선이 `role="separator"`이고 화살표 키로 조절된다
- [ ] **격자 이동의 키보드 대체 수단이 있다**
- [ ] 배치 저장 실패 시 기본 배치로 동작한다
- [ ] `MovableGrid`가 `ssr: false`다
- [ ] 1280px 미만에서 3탭으로 동작한다
- [ ] 스트리밍 중 스크린리더가 매 토큰 낭독하지 않는다
- [ ] 375px에서 body 가로 스크롤이 0이다

## Dependencies

- **선행:** `FE-REQ-007`(zone) · `008`(스트리밍) · `009`(FSD) · `026`(F004 카드) · `BFF-REQ-028`
- **선행:** `feature/repo-ui-component` 병합 (`ChatBubble`·`TextArea autoResize`·`MovableGrid`·`Chip`·`Spinner`)
- **짝:** `FE-REQ-031`(FUNC) · `032`(API) · `033`(PERF)
- **규칙:** `fsd-pages.md` · `fsd-widgets.md` · `a11y-policy.md`

## Open Questions

- **변경 금지 목록을 3탭 어디에 둘지.** 홈 5블록은 고정이므로 `TipsApp`·목표 카드·`AnalysisGraph`는 **홈 5블록 아래** 또는 **자산 탭**이다. PM 확인 필요(`FEATURE-006` Open Question).
- 자산 탭 세그먼트 3개가 **또 하나의 탭 계층**이 아닌가. 세그먼트를 같은 화면의 필터로 취급하고 데이터를 한 번에 받는 것이 기본안.
- PC 격자 기본 배치와 저장 여부. 사용자가 바꾼 배치를 저장하면 기기별로 달라진다.
- 대화 입력의 Enter 전송이 긴 질문 작성을 방해할 수 있다.
