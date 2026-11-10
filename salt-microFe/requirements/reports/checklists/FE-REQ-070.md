# FE-REQ-070 체크리스트 — 로그인 없이 투자 화면

커밋 `e958e506`. 2026-11-10. 실화면은 셸 3010(3000 은 회사 vite — 건드리지 않음) + 투자 zone dev 3002 · BFF · 서버 실스택.

## FR ↔ 구현

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 발급 경로 | 셸 `app/api/session/guest` → `api-routes/session.ts` `issueGuestCookie`(`salt_gt` httpOnly · 표지 `salt_guest=1`) · 로그인 · 로그아웃이 둘 다 지움 | 실화면 쿠키 `salt_gt httpOnly=true` · `salt_guest`, 로그인 뒤 `salt_at · salt_rt · salt_signed_in` 만 |
| FR-2 갱신 분기 | `@repo/core/auth` `withSessionRefresh` `issueGuest` · `web-shared` `issueGuestSession`(게스트 화면에서만 · 403 이면 로그인) · 첫 호출 전 미리 받기(`ensureGuest` — 표지 없을 때) | 표 테스트 7행(보낸 수 ≤ 2 · 세션 남으면 게스트로 안 내림) · 실화면 첫 방문 API 2xx 아님 0(고치기 전 401 둘) |
| FR-3 공개 경로 | `isGuestReadablePath`(공개 ∪ 투자) — 내비 숨김은 `isPublicPath` 그대로 | 경로 표 테스트(게스트 · 내비 숨김 두 열) · 실화면 7 경로 로그인 화면 0 · 레일 그대로 |
| FR-4 시장 조회 | 국내 · 검색 묶음 · 곁 칸 · 본문 · 왜 움직였나 · 검색 훅의 로그인 조건 제거 | 실화면 국내 표 · 상세 · 호가 · 뉴스 · 검색 응답 200 |
| FR-5 국내 노출 | `useKrMarketStatus` 게스트도 `ok` · WS 국내 구독이 로그인 없이 보냄 · 거부되면 게스트 받고 다시 연결 | 머리 메뉴 "주식" · 국내 표 실화면 · WS 실측(BFF-REQ-055 체크리스트) |
| FR-6 유리막 | `@repo/ui` `SignInGlass`(+ 스토리 2) · `web-shared` `SignInRequired` · `useSignInHref` · 로그인 `?next=` · `safeNextPath`(열린 리디렉트 막기) | 경계 표 14행 · Storybook 빌드에 `signinglass--*` · 실화면 로그인 → `/investments/005930` 복귀 · 이미 로그인 `/?next=/search` → `/search` · `//evil` → `/home` |
| FR-7 적용 | ★(`WatchlistStarButton` 한 곳 — 표 행 · 검색) · 코인 · 국내 상세 판단 · 주문 전 체크 · 거래 기록 · 오른쪽 코치 패널 · 관심 탭 · `/portfolio` · `/coach/*` · 머리 프로필 → "로그인" | 실화면 유리막 단추 수: 국내 상세 3 · 코인 상세 3 · 보드 1 · 포트폴리오 1 · 리포트 1 · 국내 표 게스트 ★ 57 |
| FR-8 문서 | 공개 경로 메타는 기존(투자 목록 · 상세 색인 허용, `/search` 닫힘) 그대로 · 국내 상세 서버 렌더 · 색인은 `FEATURE-018` OQ2 | — |

실화면에서 본 결함 둘 — 고침: ① 첫 방문 요청이 401 을 한 번 내고 게스트를 받음(콘솔 오류 2) → 표지 쿠키로 미리 받기 ② 게스트 검색이 대기 모양에 멈춤 — 꺼진 관심 조회의 `isPending` 이 계속 참 → 로그아웃이면 기다리지 않음(같은 꼴 grep — 나머지는 유리막 안이라 해당 없음).

## 검증

| Check | 결과 |
|---|---|
| `pnpm check-types` · `lint` | 13/13 · 13/13 |
| `pnpm test` | core 295 · ui 63 |
| zone 운영 빌드(worktree) | 셸 · 투자 성공. 투자 첫 로드 전 → 후: `/investments` 156 → 157 · 상세 152 → 153 · `/search` 169 → 171 · `/portfolio` 148 → 149 kB(예산 +40 kB 안) |
| `build-storybook` | 성공 |
| 레이어 훅 사후 실행 | Bash 로 쓴 파일 44 위반 0(음성 대조 exit 2) |
| 390 앱 웹뷰 UA | 국내 상세 그려짐 · API 4xx 0 |
| 로그인 비소유자 | 임시 사용자(만들고 지움) — 유리막 0 · 주문 전 체크 · 거래 기록 보임 |
| 만료 게스트 이어 보기 | 만료 쿠키 + 표지로 열기 → 401 둘 → 발급 → 200 · 가격 보임. 발급이 두 번 나감(웹소켓 재연결이 한 번 더 받음 — 동작 문제 없음, 미검증 아님) |
| 브라우저 국내 실시간 | 임시 BFF WS(4012, 3010 허용)로 이어 — 구독 · 체결 35건/15초 · 머리 가격 갱신 |

## 미검증

없음
