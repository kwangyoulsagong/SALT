# FE-REQ-066 체크리스트 — 검색 모달 1단계

## 2026-11-09 — `f91a5061` · `fae4cf7b` · `b37bf890`

| FR | 구현 위치 | 결과 |
|---|---|---|
| FR-1 여는 법 | `pages/search` `SearchLauncher`(투자 zone 레이아웃 `headerSearch`) · `AppNavigationSearch` · `Modal` `initialFocusRef` | ✅ `/` · 머리 칸 · `/search?q=` 셋 다 열림 · 포커스 = 검색칸(combobox) |
| FR-2 틀 | `Modal` `size="search"` · `AssetSearchDialog.css.ts` | ✅ 640×600 · 위 8 · 배경 막 없음(D2) · 본문만 스크롤 · 안내 바 52 |
| FR-3 첫 화면 | 최근 검색 칩(× 마다) · `useTopTradeValue` | ✅ "거래대금 상위" 코인 5 · 국내 5(소유자) · "{시각} 기준" |
| FR-4 입력 중 | `SearchOption`(격자 줄) · `splitHighlight` | ✅ 하이라이트 · 코드 · 현재가 · 등락률 · ★ · 자산군 칩 |
| FR-5 키보드 | `useSearchListKeys` · `@repo/core/search`(경계 표 40) | ✅ ↑↓ 돌기 · Enter 상세 · Esc 지우기 → 닫기 · 주소 0(`/search` 만 `?q=`) |
| FR-6 접근성 | `role=dialog` `aria-modal` · `aria-activedescendant` · `aria-live` | ✅ axe 0(첫 화면 · 결과 · 390 · 로그아웃) |
| FR-7 390 웹뷰 | 같은 모달 | ✅ 358 폭 · 넘침 0 |
| FR-8 2단계 | — | ⬜ 미착수(아래) |

| 검증 | 결과 |
|---|---|
| 실화면 1440 · 1024 흐름(`/` → ↓↓ → ↑↑ → "비트" → ↓ → Esc → Esc → 머리 칸 → "이더" → ↓ → Enter → 상세 → 다시 열기 → `/search?q=삼성` → Esc · Esc) | 전부 기대대로 · 넘침 0 |
| 실화면 결함 셋(고침) | ① 최근 검색 저장이 setState 업데이터 안 — 모달 언마운트로 사라짐 ② 결과 줄 ★ 단추가 listbox 밑(axe aria-required-children) → 격자 ③ 13px 등락 글자 대비 → 짙은 등락색(새 요소만) |
| 실화면에서 본 기존 결함(고침) | 1원 밑 코인이 "0원"(공용 `formatPrice` — 소비 33 파일) → 유효 숫자 넷 · 경계 표 16 |
| 실화면에서 본 504 | `ai-coach/detail?symbol=XRP` 한 번(BFF 예산 300ms × 2 — 파일을 막 고친 뒤 dev zone 재컴파일과 겹친 때). 다시 8회 냉시작 API 96건 5xx 0 — 코드 결함 아님으로 기록 |
| 모노레포 check-types · lint · test(core 14 파일 · ui 6 파일) · `test:layer-check` | 통과 |
| zone 운영 빌드 다섯 · `build-storybook`(worktree) | 통과 |
| 번들(운영 빌드, main ↔ HEAD 첫 로드) | `/investments` 152 → 153 kB · 상세 152 → 153 · `/coach/report` 148 → 149(모달이 레이아웃에) · `/search` 160 → 158 · 셸 `/home` 160 같음 |
| 레이어 훅 사후 실행 | 음성 대조 exit 2 · 차단 0 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-8 2단계(뜨는 업종 · 결과 탭 업종/뉴스/지수 · 곁 칸) | BFF · 서버 짝 REQ 가 필요(D4 포함 결정) | 다음 칸 — 짝 REQ 번호는 착수 때 |
| 로고 28 · 30 | 우리 `AssetIcon` md 32 로 — 사이 크기를 새로 두지 않음 | 디자인 단계(`FE-REQ-047`) |
| 판 면 `#FBFCFD` | 토큰 없음 | `FE-REQ-047` FR-14 |

## 2026-11-09 — 확인 2회차 `6a062b24`

| 결함 | 고침 | 실화면 |
|---|---|---|
| 결과 줄 `보유` 배지 없음(`FE-REQ-010` FR-72 퇴행) | `SearchOption` `held` | 보유 줄 1 · axe 0 |
| ★ · 칩에 포커스면 첫 Esc 에 닫힘 | 모달 `onEscape` 한 곳 — 본문이 다음 단계를 정한다 | ★ 포커스 Esc → 지움 + 검색칸 포커스 → Esc → 닫힘 |
| 뉴스 모달 위 `/` → 검색 모달 겹침 | 열린 `aria-modal` 이 있으면 단축키 무시 | 검색 안 열림 · 뉴스 모달 그대로 |
| 비소유자 열 때마다 국내 장 상태 404 | `retryOnMount: false` · 국내 표는 장 상태 ok 일 때만 | 3회 열기 404 3 → 0 |

| 다시 돈 것 | 결과 |
|---|---|
| 흐름 전체(1440) · `/search` 직접 · `?q=` · Enter · 클릭 이동(이더 · 솔라 · 삼성우 · 클릭) | 기대대로 · 이동 233~414ms(dev) |
| 모노레포 types · lint · test · layer-check · 훅 사후 실행(음성 대조 exit 2) | 통과 |
| zone 운영 빌드 다섯 · Storybook(worktree, `6a062b24`) | 통과 · 첫 로드 같음(`/investments` 153 · `/coach/report` 149 · `/search` 158 kB — `/search` 쪽 9.76 → 9.91 kB) |
| 다른 zone `/`(저축 · 가계부 · 홈) | `/search` 로 가서 모달 열림 · 검색칸 포커스 |

## 2단계 FR-8 — 2026-11-10 (`19539c95` · 서버 `dd0bbdcc` · BFF `1110aa9b` · 공용 `e00053f8`)

| 항목 | 구현 | 확인 |
|---|---|---|
| 결과 탭(결과 있는 것만 · 사라지면 전체로) | `@repo/core/search` `availableSearchTabs` · `effectiveSearchTab` · `visibleSearchResults` | vitest 표(탭 · 묶음 다섯) |
| 묶음 · 키보드 줄 순서 · 갈 곳 | `widgets/asset-search/lib/searchEntries.ts` `resultEntries` · `AssetSearchDialog` `Results`(격자 안 `rowgroup`) | ↑↓ · Enter · 클릭 |
| 업종 · 지수 · 뉴스 줄 | `entities/market` `SearchTextOption`(로고 없는 글자 행 — 같은 고른 면 · ↵ 칩) | 1440 스크린샷 |
| 곁 칸 | `SearchSidePanel` · `useSearchRelated`(150ms 머문 줄만) | 005930 → 같은 업종 3 · 업종 → 구성 5 · BTC → 함께 태그 3 |
| 지금 뜨는 업종 | `useRisingSectors`(장 상태 ok 일 때만) · 첫 화면 같은 listbox 에 이어 둠 | 5줄 · "업종 지수 등락률 순 · 시각 기준" |
| 뉴스 → 뉴스 모달 | `SearchLauncher` 가 쥔다 · `searchNewsToView`(국내 본문은 관련 종목 첫 코드) | 대화상자 1개 · 본문 · Esc 뒤 0 · 주소 그대로 |
| 업종 · 지수 → 국내 탭 | `ROUTES.investmentsKr` · `MarketBoard` `AssetParamSync`(Suspense 잎) | `/investments?asset=kr_stock` · 국내 주식 탭 선택 |

| 실화면(소유자, 1440 · dev) | 결과 |
|---|---|
| axe(다이얼로그 범위) 첫 화면 · 결과 · 뉴스 모달 | 0 · 0 · 0 |
| 콘솔 오류 · 4xx/5xx(검색 · 국내 경로) | 0 · 0 |
| 넘침 1024 · 1280 · 1440 · 1600 | 0 |
| 390 앱 웹뷰 `/search?q=삼성` | 넘침 0 · 곁 칸 숨김(한 열) · 콘솔 0 |
| 비소유자(DB 에 없는 시험 신원) | 첫 화면 코인만 · 탭 전체 · 종목 · 뉴스 · 국내 경로 요청 0(장 상태 판정 404 1회 — 1단계 그대로) |

| 실화면에서 고친 것 | 고침 |
|---|---|
| 새 탭 줄 미선택 글자 대비(axe 4 — 공용 Tabs 3단 색) | 이 탭 줄만 2단 색 — 공용 색은 다른 화면 결정이라 그대로 |
| 이니셜 판 "LS" 대비 4.37:1 | 공용 `AssetIcon` 판 색 — 불변식 테스트(`FE-REQ-005`, `e00053f8`) |
| 뉴스 · 지수 줄을 골라도 곁 칸이 "줄을 고르면…" | 골랐는데 대상이 없으면 빈 칸 |
| 실호출에서 본 제목 깨짐("삼성전기␚AI") | 서버 수집 규칙 + 저장 39행(`SRV-REQ-051`, `0df7784e`) |

| 검증 | 결과 |
|---|---|
| 모노레포 `check-types` · `lint` · `test` | 13/13 · 13/13 · 통과 |
| `test:layer-check` · Bash 로 쓴 파일 26 훅 사후 실행 | 통과 · 0(음성 대조 exit 2) |
| zone 운영 빌드 다섯(worktree `19539c95`) | 통과 — `/search` 158 → 167 kB(+9) · `/investments` 153 · `/coach/report` 149 그대로 |
| `@repo/ui` `build-storybook`(worktree `19539c95`) | 통과 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 배경 투자 화면 axe `heading-order` · `image-redundant-alt` | 1단계 전부터 있던 것 — `FE-REQ-044` 체크리스트에 기록된 것과 같은 자리 | 표면 대비 정리 REQ |
| ~~장중 `/api/app/ai-coach/detail` 504(배경 화면)~~ **닫힘 2026-11-10 `c602e97c`** | ~~사용자 지시로 AI 코치 개선 세션으로 넘김~~ 정정 — 사용자는 "개선"만 다음 세션이라 했다. 결함이라 이번에(`DB-REQ-017` 4회차) | — |

## 2026-11-10 — 투자 머리 메뉴 · 레일 복원 · 포트폴리오(주인 `FE-REQ-069`)

- 확인은 `FE-REQ-069` 체크리스트(실화면 24칸 · 넘침 0 · axe 0 · 운영 빌드 · zone 전환 9/10)
