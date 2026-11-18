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

## 2026-11-10 — F018 걸침

  - `bff/src/services/app-search.service.ts` — "국내 소유자 전용" 주석 · Swagger 문구 정정(판정은 서버 — 이제 사람 · 게스트 누구나)
  - `salt-server/src/market/application/SearchExtras.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자
  - `salt-server/src/market/application/__tests__/searchExtras.test.ts` — 테스트를 새 계약으로 — 비소유자 거절 단언을 "누구나 · 키 꺼짐만 숨김"으로
  - `salt-server/src/market/presentation/investment.controller.ts` — 국내 소유자 판정 걷기(`ADR-011`) — 시세 · 관심 · 거래 · 국내 판단 · 미러 · 복기 · 해설은 로그인 전체(시세는 게스트 포함), 전망 셋만 소유자

검증은 F018 체크리스트(`SRV-REQ-056` · `BFF-REQ-055` · `FE-REQ-070` · 루트 `requirements/reports/checklists/F018-public-market-guest.md`) — 이 REQ 의 기존 확인 항목은 다시 열지 않음(동작이 바뀐 것은 국내 소유자 판정 · 로그인 조건뿐)

## 2026-11-14 — F017 v4 2a 걸침(`SRV-REQ-058`)

- `news/domain/ports.ts` 에 AI 경로 포트 더함(`SRV-REQ-058` 2a) — 검색 묶음 포트 무변경
- 검증은 `SRV-REQ-058` 체크리스트 — 이 REQ 의 기존 항목은 다시 열지 않음


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

이 REQ 몫: 짝(공유 파일 `news/domain/ports.ts`) — `DartEarningsStore` · 본문 다시 받기 포트

| 항목 | 상태 | 근거 |
|---|---|---|
| 빌드 · 린트 · 레이어 | 충족 | `npm run build` 0 · `npm run lint` 0 · `npm run test:layer-check` 차단 10 · 통과 6 |
| 단위 시험 | 충족 | `npm test` 1730/1730 — 새 시험 `dartEarnings`(실제 원문 픽스처 9건 · 분류 경계 표 19 · 결산 이름 8) · `collectDartEarnings` 6 · `refetchDartBodies` 2 · `dartDecode` 2 · `earningsOutlook` 11 · `macroEvents` 경계 |
| 마이그레이션 | 충족 | `20261117120000` · `120100` · `120200` 로컬 적용 — 추가만(표 · 뷰 · CHECK 넓히기 · 열 하나) |
| 실데이터 수집 | 충족 | DART 실호출: 유니버스 51종목 2016~ 실적 공시 5,245 · IR 4,006 · 예고 586 · 최근 1년 IR · 예고 본문 561건 전부 읽음(실패 0) — 실적 IR 174 · 결산 기간 158 |
| 분류 표본 눈 확인 | 충족 | IR 12건 무작위 — 첫 판 거짓 양성 2(기아 CLSA · 신한 MS: 내용 칸만 실적) → '개최목적' 칸만 · 결산 기간으로 고침 |
| EXPLAIN | 충족 | 새 쿼리 다섯 0.4~4.9ms — 대기 본문 부분 인덱스 · 종목 날짜 인덱스 · `event_reaction_stats_latest` |
| 응답(실DB · 프로세스 안) | 충족 | `GetSymbolEvents` 실DB 005930 · 000660 · 000270 · 035420 · BTC — 창 · 적중 · 빗나간 결산 · 반응 게이트, 코인 `null`, 1~24ms |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| HTTP 실토큰 응답(서버 · BFF 경로) | 로컬 옛 HS 창이 닫혀(11-16) 소유자 토큰을 만들 수 없다 — 서명 키 읽기는 권한 거부. 같은 유스케이스 · 리더 · 정책을 실DB 로 프로세스 안에서 돌렸다 | 사용자 로그인 화면 QA(`QA-001`) |
| DART 본문 다시 받기 실회차 | 서버 · 뉴스 워커가 새 코드로 같이 재기동해야 한다(옛 서버 추출은 옛 사실을 안 지운다) | 머지 · `ops/salt.sh restart server news` 뒤 첫 회차 — 634건 · 하루 안 |


## 2026-11-17 — F008 슬라이스 24 2단계 확인 2회차(실토큰 · 실회차, `feat/f008-slice24-s2-earnings-window`)

이 REQ 몫: 짝(공유 파일 `news/domain/ports.ts`) — `dartRefetchedAwaitingExtraction`

| 항목 | 상태 | 근거 |
|---|---|---|
| 실토큰 HTTP | 충족 | 확인용 초대 코드 → 임시 계정(RS256) · 그 이메일만 소유자로 둔 워커 없는 서버 4020 + BFF 4011(운영 4000 · 4001 설정 무변경): 000660 · 005930 · 000270 · BTC 서버 = BFF 같은 값 · 운영 4000 비소유자 404 · 토큰 없음 401 · 빈 심볼 400 · p95 서버 4~8ms · BFF 3~4ms |
| 실로그인 화면 | 충족 | 웹 3000 실로그인(UI) → 국내 상세, 사건 호출만 브라우저 실쿠키 토큰으로 BFF 4011: 000660 · 005930 1440 · 000660 390 앱 웹뷰 — 카드 보임 · 5xx 0 · pageerror 0 · 넘침 0. 같은 사용자 운영 BFF → 404 → 카드 숨김 |
| main 실행 트리 | 충족 | `~/.salt-run`(main) `events --dry-run` 새 행과 정상 — 반응 29,349 = 브랜치 29,589 − 실적 공시 240(기존 종류 반응 수 main 과 같음) |
| 다시 받기 실회차 | 충족 · **결함 고침** | 뉴스 워커 브랜치 코드 16:05 회차 20건 + 새 공시 1 — 한글 읽힘 21/21 · 깨진 글자 0. 결함 셋 발견 · 고침: ① 다시 받기가 추출을 앞질러 문단 7일 보관이 처음 받은 때(`fetched_at`) 기준이라 추출 전에 지워짐 → 보관 기준 `COALESCE(refetched_at, fetched_at)` ② 추출 순서가 `fetched_at` 이라 다시 받은 본문이 늘 맨 앞 → 오늘 기사 밀림 → 같은 기준으로 줄 ③ 속도 — 추출 대기 20건 아래일 때만 그만큼(`DART_REFETCH_MAX_PENDING`). 재기동 뒤 16:15 회차 0건(대기 20) 실측 · EXPLAIN 0.5ms |
| 패널 504 탐침 | 기록 | 운영 BFF 패널 · 판단 432회(16:03~16:11, 장중 수집 주기 포함) — 200 431 · 504 1(16:10:12 = 서버 재기동 6초 뒤). 평상시 p95 36ms. 재기동 직후 차가운 첫 요청이 BFF 예산 400ms 를 넘는 기존 현상 — 이 슬라이스 원인 아님 |
| 정리 | 충족 | 임시 계정 앱 계정 삭제 경로로 지움(계정 2 → 1 · 모든 스키마 `user_id` 0) · 확인용 초대 코드 0 · 4020 · 4011 끔 · 토큰 파일 지움 |
| 서버 검증 | 충족 | `build` 0 · `lint` 0 · `test` 1731/1731(다시 받기 속도 경계 시험) · `test:layer-check` |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 다시 추출 실회차(사실 교체) | 오늘 LLM 추출 몫 소진("추출 0 · 다음 회차 12") — 교체 규칙은 실DB 시험 행으로 확인(같은 '무엇' 같은 id · 안 나온 것 지움 · 다른 키 무변경) | 내일 추출 회차 — 다시 받은 키 `dart:20261116800009` 옛 사실 8건 기록해 둠 |
| DART 014(문서 없음) 재시도 | 기존 현상 — 같은 5건이 워커 재기동마다 3회씩(11-16 부터 39회). 화면 영향 0 · 호출 낭비 | 별도(다음 DART 손볼 때) |
| 재기동 직후 패널 504 | 기존 현상 — 차가운 첫 요청 > BFF 400ms | 별도(서버 기동 예열) |


## 2026-11-17 — F008 슬라이스 24 2단계 확인 3회차 — 기존 현상 둘 고침(장중 · 재기동 뒤 504, DART 014 재시도)(`feat/f008-slice24-s2-earnings-window`)

이 REQ 몫: 짝(공유 파일 `news/domain/ports.ts`) — `markDisclosureMissing`

| 항목 | 상태 | 근거 |
|---|---|---|
| 원인 좁히기 | 충족 | 운영 BFF 탐침(0.5초) × 재기동 6회 · 장중 회차 6분 · 워커 없는 새 서버 첫 요청 · 서버 CPU 프로파일 · `pg_stat_activity` 장기 쿼리 표본 · 쿼리 버퍼(`EXPLAIN ANALYZE BUFFERS`) |
| 예측 검증 | 충족 | `ruff` · `format` · `pyright` 0 · `lint-imports` 3 · `pytest` 전체 · 누수 · `tests/store` 실DB(새 가드 2) · 결과 같음 6조합 · 변이(옛 GROUP BY) 가드 깨짐 |
| 서버 검증 | 충족 | `build` 0 · `lint` 0 · `test` 1739/1739(새: 부팅 순서 · 락 2 · 풀 라우팅 5(진짜 node-cron) · 보관 지우기 · DART 영구 실패 경계) · `test:layer-check` · 변이 둘(락 · 라우팅) 깨짐 확인 |
| 실DB · 실회차 | 충족 | `markDisclosureMissing` 두 번 = 1행 · 뉴스 워커 실회차 014 두 건 `empty` · 다음 회차 다시 부름 0 |
| 정리 | 충족 | 확인용 임시 계정 앱 삭제 경로로(계정 1) · 초대 코드 0 · 프로파일 서버 끔 · 운영 서버 launchd 다시 등록(실험 중 약 2분 꺼짐) |

### 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 예측 수정의 운영 효과 실측(504 0) | 예측 배치는 머지된 main 실행 트리에서 돈다(`OPS-005`) — 지금 매시 · 장중 회차는 옛 쿼리. 효과는 쿼리 단위로 실측(읽기 4.5GB → 22MB) | 머지 · 매시 동기화 뒤 장중 패널 탐침(결함 줄 `패널 느림` · BFF 504 0) |
| 서버 쪽 수정 운영 실측 | 서버 · 뉴스 워커는 브랜치 코드로 재기동해 둠. 지우기 매시 :37 첫 회차 · 풀 나눔 효과는 예측 수정과 같이 봐야 갈린다 | 위와 같이 |

## 2026-11-18 F006 포지션 1단계(`feat/f006-position-overview`)

- `salt-server/src/news/domain/ports.ts` — Port `sentimentCounts` 선언을 더했다. 기존 시험 전부 통과(서버 1895 · BFF 533 · FE check-types · lint)
- 미충족: 없음(이 REQ 몫 변경 0)
- 근거: 루트 체크리스트 `requirements/reports/checklists/F006-position-overview.md`
