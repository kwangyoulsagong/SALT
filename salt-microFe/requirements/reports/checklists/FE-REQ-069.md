# FE-REQ-069 체크리스트 — 투자 zone 머리 메뉴 · 레일 복원 · 포트폴리오

커밋 `f193c6aa` · `29b9a212` · `c914fe2e`. 2026-11-10. 리서치 `requirements/reports/research/2026-11-10-invest-header-portfolio.md`(참고 증권 웹 둘 실측 · 공개 자료).

| FR | 구현 | 확인(실화면 3000 dev · 소유자) |
|---|---|---|
| FR-1 레일 | `@repo/ui` `AppNavigation` 레일 칸 값 복원(`FE-REQ-054`) · placement `rail` | 1024 · 1280 · 1440 · 1600 × 홈 · 저축 · 가계부 · 투자 · 포트폴리오 · 리포트 — 레일 · 지금 탭 24/24 |
| FR-2 메뉴 | `AppNavigationHeaderNav` · `@repo/core/navigation` `INVEST_MENU` · `activeInvestMenu` · `pages/investments` `InvestHeaderNav`(Suspense 잎) | 메뉴 투자 zone 화면만 · 지금 메뉴 표시 · 상세 005930 → 주식 |
| FR-3 검색칸 | `AppShell` 기본값 삭제 · `HeaderSearchLink` 삭제 | 다른 zone 검색칸 없음 · 저축 `/` 무반응 |
| FR-4 포트폴리오 | `pages/portfolio`(새 슬라이스 — 레지스트리) · `HoldingsPanel` 공개 · 리포트에서 보유 · 토글 뺌 · zone 레지스트리 `/portfolio` | 보유 + 매입가 숨김 · 리포트에 보유 칸 없음("내 보유" 글자는 익절 플랜 문장) |
| FR-5 본문 | `MarketBoard` 자산군은 `?asset=`(없으면 코인) · 탭 · 리포트 링크 삭제 | 주식 → `?asset=kr_stock` · 코인 → `/investments` · 뒤로 → 주식 |
| FR-6 | — | 넘침 0/24 · axe(머리 · 레일) 0 · 900 하단 탭 + 메뉴 · 390 웹뷰 숨김 |

| 검증 | 결과 |
|---|---|
| 모노레포 types · lint · test · layer-check · 훅 사후 실행(음성 대조 exit 2) | 13/13 · 13/13 · 통과(core 262 · ui 63) · 통과 · 0 |
| zone 다섯 운영 빌드 · `static:merge` · `build-storybook`(worktree) | 통과 · 충돌 0 · 통과 |
| 번들(운영) | `/investments` 166 → **156 kB**(뉴스 모달 늦게 — `c914fe2e`, 검색 2단계 때 153) · `/portfolio` 148 · `/coach/report` 148 · `/search` 169 |
| zone 전환(운영 · Chrome 157 · 레일 링크) | 올린 뒤 적중 9/10(첫 회 차가움) · 중앙 2 · 0ms / 바로 누름 중앙 69 · 125ms — 퇴행 0(`FE-REQ-067` 표와 같은 범위) |
| 뉴스 모달(코인 프리뷰 새로고침 · 상세 소식) | 같은 기사 · 모달 1개 · 상세 그대로 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 비로그인 공개 시세 · 게스트 토큰 · 글래스 | 사용자 결정 2026-11-10 — 다음 REQ(서버 · BFF · FE 짝) | 다음 REQ |
| 오른쪽 레일 "내 투자" 요약(참고 웹 A 패턴) | 투자 화면 오른쪽 칸은 코치 패널 — 범위 밖 | 별도 기획 |
| ai-coach 504 세 번(10:30 · 10:51 · 11:03) | 서버 처리 26~31ms(코인) · 기계 부하(평균 18 — 운영 빌드 열 번 · dev 재기동) 때 BFF 300ms 초과. 같은 부하에서 KR 30회 p90 86ms · 0 실패 | 부하 없는 장중에 다시 셈(`DB-REQ-017`) |

## 2026-11-10 — F018 걸침

  - `salt-microFe/packages/domain-invest/src/pages/investments/ui/InvestHeaderNav.tsx` — "국내 소유자 전용" 주석 정정(`ADR-011`)
  - `salt-microFe/packages/domain-invest/src/pages/portfolio/ui/PortfolioBody.tsx` — 사람 · AI 칸 유리막(`SignInRequired`)

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)
