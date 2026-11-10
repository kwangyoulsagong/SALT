# FE-REQ-068 체크리스트 — 모달 기사 본문

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 | `entities/market/lib/newsArticle.ts` `bodyRef` · `@repo/core/newsBody` | 국내 시황 · 공시(null) · 코인 |
| FR-2 | `ui/News/NewsModal.tsx` `ArticleBodyBlock` · `News.css.ts` `article` · `paragraph` | 실화면 1440 — 005930 · 005490 본문 7/8 · 코인 10문단 0.5초 · axe 0 · 넘침 0 · `<script` 0 |
| FR-3 | 같은 자리 되돌림 | route 로 unavailable · 500 → 안내 · 2.5초 지연 → 줄 자리(`aria-busy`) → 본문 |
| FR-4 | `krStockMessages.ts` 안내 문구 | 실화면 문구 |

| 검증 | 결과 |
|---|---|
| `@repo/domain-invest` check-types · lint | 통과 |
| `@repo/core` test · check-types | 184/184 |
| 레이어 훅 사후 실행 | 음성 대조 exit 2 · 바뀐 12 파일 exit 0 |
| 바뀐 zone 운영 빌드(`web-investment`, worktree) | 통과 · `/investments` 첫 로드 152 kB · `/investments/[symbol]` 152 kB(공용 104 kB) — 본문 칸은 모달 안 잎이라 새 청크 0 |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 포털에 없는 작은 매체 기사(코인 4/25 못 찾음) | 원장 주소가 중계 주소라 원문을 바로 못 연다 | 중계 주소 풀기 — 필요해지면 새 REQ |
| 캐시 보존 정리 | 행 수 = 연 기사 수(하루 수십) — 지금 정리할 양이 아니다 | 1만 행 넘으면 `fetched_at` 정리(`DB-REQ-042`) |
| 언론사 페이지 모양 변화 | 뽑기 규칙은 실측 25 + 25건 기준 | 잘못 뽑힌 본문을 보면 규칙 고치고 판(`BODY_EXTRACTOR_VERSION`) 올림 |
| 390 웹뷰 모달 | `FE-REQ-065` FR-8(바텀 시트) 남음 | 그 칸 |
| 3000 실화면 | 3000 은 회사 서버가 쓰는 중 — 3001 에서 봤고 3001 은 BFF WS 허용 origin 밖이라 국내 화면은 소켓을 조용한 것으로 바꿨다 | 3000 이 비면 다시 |

## 확인 2회차(2026-11-09)

| 항목 | 결과 |
|---|---|
| 비로그인 코인 모달 | 본문 요청 0 · 요약 · 원문 단추 |
| 국내 상세(재) | 본문 2 · 자동 시황 2 "본문을 찾지 못했어요" · axe 0 |
| 로딩 · 실패 | 2초 지연 → 줄 자리 → 본문 · unavailable · 500 → 안내 |
| 모노레포 check-types · lint | 13/13 · 13/13 |
| 레이어 훅 사후 실행 | 음성 대조 exit 2 · 바뀐 3 파일 exit 0 |

## 2026-11-10 — 모달 그리는 자리 이동(주인 `FE-REQ-065`)

- 본문 칸 무변경 — 새로고침 뒤 다시 연 모달에서도 본문(코인 XRP 기사) 그대로. 확인은 `FE-REQ-065` 체크리스트
