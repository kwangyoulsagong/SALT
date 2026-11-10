# SRV-REQ-055 체크리스트 — 검색 모달 2단계 서버 경로

커밋 `dd0bbdcc`(경로) · `0df7784e`(제목 깨짐 — 주인 `SRV-REQ-051`). 2026-11-10.

## FR ↔ 구현

| FR | 구현 | 확인 |
|---|---|---|
| FR-1 묶음 | `market/application/SearchExtras.ts` `SearchResultGroups` · `domain/SearchExtras.ts` `matchesName` · `matchKrIndexCodes` · `currentSectors` · 저장소 `PrismaKrMoveSourceStore.searchNewsTitles` · `sectorBoard` · `news` `PrismaArticleRepository.searchTitles` | 테스트 · 실호출 "삼성" · "코스" · "전기" |
| FR-2 뜨는 업종 | `ReadRisingSectors` · `currentSectors`(가장 늦은 거래일) · `latestAsOf` | 실호출 5줄 — `0027`(11-06) 빠짐 |
| FR-3 곁 칸 | `ReadSearchRelated` · `rankCoTagged` · `byChangeRateDesc` · `news` `symbolTagLists` | 005930 → 전기·전자 3 · `?sector=0013` 5 · BTC → 함께 태그 3 |
| FR-4 소유자 | `isKrStockViewer` 세 유스케이스 | 비소유자 테스트(국내 읽기 0) · 화면 비소유자 국내 요청 0 |
| FR-5 입력 | `presentation/dto/search.dto.ts` 세 스키마 | DTO 경계 표 테스트 · `?sector=13` 400 |
| FR-6 비용 | 요청당 읽기 수(유스케이스 머리) | `EXPLAIN (ANALYZE, BUFFERS)` 아래 |

## 검증

| Check | 결과 |
|---|---|
| Build | `npm run build` 0 |
| Lint | `eslint .` 0 |
| Test | 1057 통과(새 15 + DTO 3) |
| Layer | `test:layer-check` 통과 · Bash 로 쓴 파일 17 훅 사후 실행 0(음성 대조 exit 2) · 테스트에서 presentation import 를 훅이 막아 DTO 테스트를 presentation 으로 옮김 |
| Prisma | DDL 0 — `prisma:generate` 불필요 |
| Swagger | 세 경로 JSDoc |
| 실호출 | 소유자 토큰 — rising 5 · groups(삼성 · 코스 · 전기) · related(국내 · 업종 · 코인) · 400 · 묶음 10ms |
| Auth | 세 경로 `authMiddleware` · 국내는 이메일 판정 |

## EXPLAIN (2026-11-10)

| 쿼리 | 계획 | 시간 |
|---|---|---|
| 국내 제목 `ILIKE` 일주일 | `kr_news_title_published_at_idx` 뒤로 · 7행 | 0.26ms |
| 코인 제목 `ILIKE` 일주일 | `news_articles_published_at_idx` 뒤로 | 0.08ms |
| 코인 태그 30일 `symbols @>` 300 | `published_at` 인덱스 뒤로 | 1.8ms |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 업종이 유니버스 업종뿐(약 17) | 원천이 유니버스 종목의 업종만 모은다(`DB-REQ-041` FR-4) | 전체 업종이 필요해지면 수집 범위 REQ |
| 코인 업종 · 테마 | 원천 0 — 칸을 두지 않는다 | 원천이 생길 때 |
