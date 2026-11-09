# FE-REQ-067 체크리스트 — 머리 내비(안 B) · 머리 검색칸

## 2026-11-09 — `334084aa`

| FR | 구현 위치 | 결과 |
|---|---|---|
| FR-1 링크 14/600 · 36 · 8×12 · 모서리 9 · 진하기로만 · `aria-current` | `@repo/ui` `AppNavigation.css.ts` `item` `placement: header` | ✅ 실측 36/14px/600 · 선택 `rgb(25,31,40)` · 미선택 `rgba(22,31,46,.64)` |
| FR-2 검색칸 200×32 · `/` | `AppNavigationSearch` · `isTypingTarget`(경계 표 10) · `HeaderSearchLink`(다른 zone = `/search` 링크) | ✅ 200×32 · 이름 "종목 검색 — / 를 눌러 검색해요" · 안 글자 회색 700(실측 #6B7684 는 axe 대비 미달) |
| FR-3 머리 하나 | `AppShell` `headerSearch` → `ZoneNavigation` → `AppNavigation` | ✅ zone 은 칸만 바꾼다 |
| FR-4 레일 삭제 · 하단 탭 유지 | `AppNavigation.tsx` · `.css.ts` | ✅ `[data-app-navigation="rail"]` 0 · 768~1023 하단 탭 그대로 |
| FR-5 prerender · 전환 | 같은 `AppTabLink` · 전환 이름 `rail` 삭제 | ✅ 링크 표지 그대로 · ⬜ 전환 시간 계측(아래) |

| 검증 | 결과 |
|---|---|
| 실화면 3001 — 홈 · 투자 · 저축 · 가계부 × 1024 · 1280 · 1440 · 1600 | 머리 52 · 링크 넷 · 지금 탭 하나 · 넘침 0 (16/16) |
| axe(머리) 1440 × 네 zone | 0(처음 1 — 검색칸 안 글자 대비 → 회색 700) |
| 모노레포 check-types · lint · test(core · ui) · `test:layer-check` | 통과(차단 16 · 통과 10) |
| zone 운영 빌드 다섯(worktree) · `build-storybook` | 통과 · 셸 `/home` 첫 로드 160 kB 같음 |
| 레이어 훅 사후 실행(Bash 로 쓴 파일 전부) | 음성 대조 exit 2 · 차단 0 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| zone 전환 시간 퇴행 0(`FE-REQ-054` FR-6 방식) | 운영 빌드 다섯 zone 동시 기동 + CDP prerender 절차가 필요 — 링크 · prerender 표지 코드는 그대로(같은 `AppTabLink`) | `FE-REQ-066` 2단계 운영 빌드 확인 때 같이 |
| 768~1023 머리 검색칸 | 하단 탭 화면은 머리 칸이 좁아 숨겼다 — `/` 단축키는 투자 zone 에서 그대로 | 디자인 단계(`FE-REQ-047`) |
