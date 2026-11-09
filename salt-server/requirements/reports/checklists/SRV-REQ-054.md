# SRV-REQ-054 체크리스트 — 기사 본문

| FR | 구현 | 검증 |
|---|---|---|
| FR-1 판정 | `news/domain/ArticleBody.ts` `pickSameArticle` · `titleSimilarity` | 허용 · 거절 표(같은 날 · 2일 밖 · 남의 기사 · 없음) · 포털 우선 |
| FR-2 뽑기 | `news/infrastructure/ArticlePageFetcher.ts` `extractParagraphs` · `decodeHtml` | 포털 본문 칸 실측 모양(글자 직접 + 사진 표) · 읽기 모드 · EUC-KR |
| FR-3 정리 | `cleanParagraphs` | 꼬리 줄 · 조각 · 관련 기사 머리에서 멈춤 · 제목 되풀이 · 상한 |
| FR-4 캐시 | `ReadArticleBody` · `PrismaArticleBodyStore` | 두 번째 검색 0 · 동시 1회 · 못 찾음 3시간 · 실패 30분 · 옛 판 다시 |
| FR-5 경로 | `news.routes` `/:id/body` · `krStock.routes` `/:code/news/:serial/body` · `GetKrNewsBody` | 남의 일련번호 · 형식 · 비소유자 404 · 공시 검색 0 |
| FR-6 안전 | `isPrivateAddress` · 에이전트 `lookup` | 사설 · 루프백 · 링크 로컬 · v6 · 매핑 주소 표 |
| FR-7 키 | `env.ts` `NAVER_CLIENT_*` 선택 · `NaverNewsSearch.enabled` | 키 없음 503 · 캐시 있으면 그것 |
| FR-8 AI 입력 0 | 읽는 곳 = `GetKrNewsBody`(화면) · 코인 경로뿐 | grep 2026-11-09 — coach · 해설 0 |

| 검증 | 결과 |
|---|---|
| `npm run build`(tsc) · `npm run lint` | 통과 |
| `npm test` | 1031/1031 |
| `prisma migrate deploy` · `prisma:generate` | 로컬 운영 DB 적용 |
| 레이어 훅 사후 실행 | 음성 대조 exit 2 · 바뀐 28 파일 exit 0 |
| 실데이터(서버 직접) | 코인 21/25 ok(평균 1,439자) · 국내 13/25 ok(평균 1,221자) — 못 찾음 12 중 9 자동 생성 시황 · 첫 조회 약 1.7초 · 두 번째 수십 ms |

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| 포털에 없는 작은 매체 기사(코인 4/25 못 찾음) | 원장 주소가 중계 주소라 원문을 바로 못 연다 | 중계 주소 풀기 — 필요해지면 새 REQ |
| 캐시 보존 정리 | 행 수 = 연 기사 수(하루 수십) — 지금 정리할 양이 아니다 | 1만 행 넘으면 `fetched_at` 정리(`DB-REQ-042`) |
| 언론사 페이지 모양 변화 | 뽑기 규칙은 실측 25 + 25건 기준 | 잘못 뽑힌 본문을 보면 규칙 고치고 판(`BODY_EXTRACTOR_VERSION`) 올림 |
| 390 웹뷰 모달 | `FE-REQ-065` FR-8(바텀 시트) 남음 | 그 칸 |
| 3000 실화면 | 3000 은 회사 서버가 쓰는 중 — 3001 에서 봤고 3001 은 BFF WS 허용 origin 밖이라 국내 화면은 소켓을 조용한 것으로 바꿨다 | 3000 이 비면 다시 |
