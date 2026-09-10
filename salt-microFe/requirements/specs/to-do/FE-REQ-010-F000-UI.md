---
id: FE-REQ-010
feature: F000
area: fe
kind: UI
title: "F000 정리·편집 — 웹 UI 정의 (수리 9건 · 변경 금지 목록 보존 · 초대 코드 화면)"
priority: high
labels: [fe, ui, fsd, repair, no-change-list, a11y, responsive]
created: 2026-09-09
source: pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md (C절 FR-20~29)
---

## Summary

F000의 UI 작업은 **깨진 것을 고치는 것**이다. 새 화면은 초대 코드·온보딩 둘뿐이고, 나머지는 수리 9건이다. 그리고 **변경 금지 목록을 침범하지 않는 것**이 이 REQ의 가장 중요한 수용 기준이다.

## 변경 금지 목록 — 먼저 못 박는다

이관·수리 과정에서 **파일이 옮겨질 뿐 렌더 결과가 같아야 한다.** 작업 전/후 스크린샷 비교가 수용 기준이다.

| 대상 | 근거 |
|---|---|
| 홈 목표 진행 카드 · `AnalysisGraph` 카테고리 막대(진입 애니메이션 포함) · `TipsApp` 금융 팁 · 프로필 헤더 | 사용자 명시: *"이뻐서 냅두고 싶어, 의미도 있고"* |
| 실시간 테이블 **5컬럼**(현재가·변동률·최고가·최저가·거래대금) · 정렬 5 / 순서 2 / 기간 7 필터 · 별 아이콘 · 로고 · **변동률 blink 2초** · `limit=100` | 완성도가 가장 높은 화면 |
| `PreviewChart` 5분봉 + 실시간 캔들 수신 | 동작 확인됨 |
| 심리 온도계 · 스마트 머니 원형 게이지 | 시각·정보 모두 유효 |
| 2컬럼 레이아웃 (좌측 테이블 + 우측 392px 프리뷰) | PC 그대로 |
| 색 토큰 — 상승 `#FF2E55` / 하락 `#1677EE` / 브랜드 `#007AFF` / 배경 `#F2F4F6` | 신규 화면도 이 규칙을 따른다 |

> **`FEATURE-005`가 요구했던 `TipsApp`·`Goals`·`MarketIntelligencePreview`·`InvestmentFilterTabs` 삭제는 철회됐다.** `FEATURE-000` 개정이 이깁니다 — 삭제하지 않고 3탭 IA 안에 배치한다.

## 수리 9건

| ID | 대상 | 지금 상태 | 고칠 것 | 우선순위 |
|---|---|---|---|---|
| FR-1 | **관심 종목 탭** | `{activeTab === "realtime" && <RealtimeInvestment/>}` 뿐이라 탭을 누르면 **빈 화면** | watchlist 목록 화면을 붙인다. **탭을 없애지 않는다** | Must |
| FR-2 | **하드코딩 시각** | `RealtimeInvestment.tsx:103` `"실시간 오늘 19:30 기준"` | **WebSocket 마지막 수신 시각**으로 | Must |
| FR-3 | **뉴스 프리뷰** | `MarketIntelligenceNewsPreview.tsx:27`에 테스트 문자열 `faskdljfaksjf…`. 제목·요약·이미지·출처·조회수가 전부 상수 | `/api/app/news` 실데이터. **블록을 없애지 않는다** | Must |
| FR-4 | **오타** | `MyInvestments.tsx:36` `{difference}% 덜 썻어요` | `덜 썼어요` | Must |
| FR-5 | **빈 "주식" 섹션** | `<Heading>주식</Heading>`만 있고 자식이 없다 | `portfolio/summary`로 보유 요약(종목·평가금액·손익률·자산군 배지) | Must |
| FR-6 | **터치 선택** | 행 선택이 `onMouseEnter`만이라 **터치 기기에서 우측 상세가 안 바뀐다** | `onClick`을 **추가**한다(hover 유지) | Must |
| FR-7 | **반응형** | 표가 가로로 잘리고 `maxHeight="800px"` 고정 | ① 표에 자체 `overflow-x` 컨테이너 ② 모바일에서 `MarketPreview`를 아래로 접기 ③ `maxHeight`를 뷰포트 기준으로. **레이아웃을 바꾸지 않는다** | Must |
| FR-8 | **차트 period** | `constants/api.ts:28` `period=miniute` | `period=minute`. **프론트가 먼저 배포**된다 | Must |
| FR-9 | **목표 저축 submit** | 폼이 `POST /api/goals`까지 연결되는지 불명확 | 검증하고 끊겨 있으면 잇는다. **UI는 유지** | Should |

## 신규 화면 2개

### 초대 코드 + 온보딩 3스텝

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-20 | 회원가입 화면을 **초대 코드 화면으로 대체**한다. 비밀번호 변경·계정 삭제 화면을 제거한다 | Must |
| FR-21 | 온보딩 3스텝: ① 초대 코드 ② 계좌 연결(업비트 CSV / KIS) ③ 월 적립액. **그 외 질문 없음** | Must |
| FR-22 | `ProgressStepper`로 현재 위치를 표시한다(`aria-current="step"`) | Must |
| FR-23 | 코드 입력 중 `invite/check`로 유효성을 보여준다. **상한 초과는 노출하지 않는다** | Must |
| FR-24 | 실패 `reasonCode` 3종을 각각 다른 문구로: 없는 코드 / 이미 사용됨 / 만료됨 | Must |
| FR-25 | 온보딩 미완료면 홈에서 **온보딩 카드 1개**만 보여준다. 블록마다 중복 안내하지 않는다 | Must |
| FR-26 | 코드 입력 필드에 붙여넣기를 허용한다. 자동 대문자화·공백 제거 | Should |

## 관심 종목 탭 (FR-1 상세)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-30 | 목록에 종목명·심볼·**현재가·변동률**·자산군 배지·별 아이콘(제거 액션) | Must |
| FR-31 | `priceStale: true`(국내·미국 주식)면 **"지연" 배지**를 붙인다 | Must |
| FR-32 | 행을 누르면 우측 프리뷰가 그 종목으로 바뀐다. 실시간 탭과 **같은 동작** | Must |
| FR-33 | 관심 종목 0건이면 빈 상태 + "실시간 차트에서 별을 눌러 추가하세요" | Must |
| FR-34 | 실시간 탭의 별 아이콘과 **상태가 동기화**된다. 추가/제거가 양쪽에 반영된다 | Must |
| FR-35 | 색 토큰은 실시간 테이블과 **같은 규칙**(상승 `#FF2E55` / 하락 `#1677EE`) | Must |

## 뉴스 프리뷰 (FR-3 상세)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-40 | 실데이터: 제목·요약·이미지·출처·발행시각 | Must |
| FR-41 | `imageUrl`이 `null`이면 **이미지 영역을 렌더하지 않는다.** 플레이스홀더를 만들지 않는다 | Must |
| FR-42 | 뉴스 0건이면 "관련 뉴스가 없습니다". **더미를 만들지 않는다** | Must |
| FR-43 | 발행시각을 상대 시간으로("3시간 전"). 서버가 준 ISO를 클라이언트가 포맷 | Must |
| FR-44 | 제목을 누르면 원문으로 이동한다(`target="_blank"` + `rel="noopener"`) | Must |
| FR-45 | **블록 구조·크기를 바꾸지 않는다.** 데이터만 실제로 바꾼다 | Must |

## 반응형 (FR-7 상세)

| ID | 요구사항 | 우선순위 |
|---|---|---|
| FR-50 | **PC 2컬럼 레이아웃을 유지한다**(좌측 테이블 + 우측 392px) | Must |
| FR-51 | 표에 **자체 `overflow-x` 컨테이너**를 둔다. `body`가 가로로 스크롤되지 않는다 | Must |
| FR-52 | 모바일(< 768px)에서 `MarketPreview`를 **아래로 접는다.** 숨기지 않는다 | Must |
| FR-53 | `maxHeight="800px"` 고정을 **뷰포트 기준**(`calc(100vh - N)`)으로 바꾼다 | Must |
| FR-54 | 375 / 390 / 1440 3뷰포트에서 검수한다 | Must |
| FR-55 | 표 컬럼 5개를 **줄이지 않는다.** 좁으면 스크롤한다 | Must |

## 접근성

| ID | 요구사항 |
|---|---|
| FR-60 | 터치 선택(FR-6)이 키보드로도 동작한다(`onKeyDown` Enter/Space) |
| FR-61 | 표 행이 선택 가능함을 `role`/`tabIndex`로 알린다 |
| FR-62 | 손익 부호를 색 + `+`/`−` 문자 |
| FR-63 | `FilterTabs`에 `role="tablist"`·`aria-selected`가 **없다**(알려진 제약). F000에서 추가한다 |
| FR-64 | 온보딩 `ProgressStepper`에 `aria-current="step"` |
| FR-65 | 별 아이콘 버튼에 `aria-label`("관심 종목 추가/제거") |

## Acceptance Criteria

- [ ] **변경 금지 목록 항목이 3뷰포트에서 시각적으로 동일하다** (작업 전/후 스크린샷 비교)
- [ ] `TipsApp`·`Goals`·`MarketIntelligencePreview`·`InvestmentFilterTabs`가 **삭제되지 않았다**
- [ ] 변동률 blink 2초가 동작한다
- [ ] 실시간 테이블 컬럼이 5개이고 필터가 정렬 5 / 순서 2 / 기간 7이다
- [ ] `limit=100`이 유지된다
- [ ] **관심 종목 탭이 빈 화면이 아니다**
- [ ] 관심 종목에 현재가·변동률이 있고 `priceStale`이면 "지연" 배지가 붙는다
- [ ] 관심 종목 행 선택이 우측 프리뷰를 바꾼다
- [ ] 실시간 탭 별 아이콘과 관심 종목 목록이 동기화된다
- [ ] 테이블 헤더 시각이 **하드코딩이 아니고 WS 마지막 수신 시각**이다
- [ ] **`grep -rn "faskdljf" apps/` = 0**
- [ ] 뉴스 프리뷰에 실제 기사가 나온다
- [ ] `imageUrl` null 시 이미지 영역이 렌더되지 않고 플레이스홀더가 0건이다
- [ ] 뉴스 0건에서 더미가 0건이다
- [ ] **`grep -rn "덜 썻어요" apps/` = 0**
- [ ] 홈 "주식" 섹션에 보유 요약이 렌더된다
- [ ] **터치(클릭)로 테이블 행을 선택하면 우측 상세가 바뀐다**
- [ ] 행 선택이 키보드로도 동작한다
- [ ] **375px에서 `body`가 가로로 스크롤되지 않고 표만 자체 스크롤된다**
- [ ] 모바일에서 `MarketPreview`가 아래로 접힌다 (숨김 0건)
- [ ] `maxHeight` 고정값이 뷰포트 기준으로 바뀌었다
- [ ] PC 2컬럼 레이아웃이 유지된다
- [ ] **`grep -rn "miniute" apps/` = 0**
- [ ] 목표 저축 submit이 `POST /api/goals`까지 연결된다 (E2E 1건)
- [ ] 회원가입·비밀번호 변경·계정 삭제 화면이 0건이다
- [ ] 온보딩 3스텝이 완주되고 `ProgressStepper`가 현재 위치를 표시한다
- [ ] 코드 입력 중 유효성이 표시되고 **상한 초과가 노출되지 않는다**
- [ ] 실패 `reasonCode` 3종이 각각 다른 문구다
- [ ] 온보딩 미완료 시 홈에 카드 1개만 나온다
- [ ] `FilterTabs`에 `role="tablist"`·`aria-selected`가 있다
- [ ] 별 아이콘에 `aria-label`이 있다

## Dependencies

- **선행:** `FE-REQ-009`(FSD) · `BFF-REQ-008`(F000 계약)
- **짝:** `FE-REQ-011`(FUNC) · `012`(API) · `013`(PERF)
- **순서:** FR-8(`period`)은 **프론트가 먼저 배포**된 뒤 서버가 오타를 거부한다
- **규칙:** `a11y-policy.md` · `i18n-policy.md` · `component-convention.md`

## Open Questions

- 홈 "주식" 섹션이 크립토를 포함할지. **제목이 "주식"이므로 제외해야 할 수 있다** → PM 확인 필요(`SRV-REQ-008` Open Question).
- 관심 종목 탭이 3탭 IA에서 어디에 있을지. 현재 `/investments` 탭인데 **F006에서 `자산` 탭 또는 PC 격자 패널**로 옮겨진다 → F000에서는 현재 자리에 고치고 F006에서 재배치한다.
- `FilterTabs`의 `role="tablist"` 추가가 `SegmentedControl`로 교체를 요구하는지. `@repo/ui` 제약(`FE-REQ-006` 회고)을 확인해야 한다.
