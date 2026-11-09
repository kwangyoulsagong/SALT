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
