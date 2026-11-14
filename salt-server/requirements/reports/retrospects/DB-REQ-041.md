# DB-REQ-041 — 회고

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06)

- VI 표에 마스터 FK 를 걸려다 실측 응답에서 ETN(Q 접두) 코드를 보고 뺐다 — 걸었으면 회차마다 그 행들이 FK 로 실패했다
- 시장 조치 upsert 를 "끝은 한 번 보면 지우지 않는다 · feed 가 inferred 를 이긴다"로 두어 실측 원천이 들어와도 표를 바꾸지 않는다

## 단계 B(2026-11-06)

- 연결 표에 게시 시각을 같이 둬 "한 종목 오늘 제목"이 인덱스 하나 + PK 조인으로 끝난다(0.14ms)
- 첫 마이그레이션 FK 를 이름 없는 인라인으로 썼다가 `prisma migrate diff` 가 이름 · ON UPDATE 차이를 잡았다 — 커밋 전이라 로컬에서 되돌리고 이름 붙인 제약으로 다시 적용. **새 FK 는 Prisma 기본 이름(`<표>_<열>_fkey`) · `ON UPDATE CASCADE` 로 쓴다**
- 장중 수급 표는 원천이 있는 프로그램 열만 — 빈 열을 미리 만들지 않았다

## 단계 C(2026-11-09)

- 코인 경보 열을 새로 만들려던 FR-7 을 기존 매일 스냅샷 뷰로 바꿨다 — 같은 공식 원천을 두 곳에 두지 않는다
- `move_beta` 는 as_of 마다 쌓는다(재현 · 과거 as_of). 보존 정리는 아직 없다 — 미검증 표
- 루트 회고 `requirements/reports/retrospects/F016-C-move-split-facts.md`

## 2026-11-09 — 기사 본문

- 이 REQ 의 파일은 본문 경로를 잇는 자리만 바뀌었다(`PrismaKrMoveSourceStore.newsTitle(serial, code)`). 판단 · 교훈은 주인 회고(`SRV-REQ-054` — 실측 먼저 · 영구 캐시엔 규칙 판 번호)

## 2026-11-10 — 검색 모달 2단계

- 업종 표에 지난 날 값이 남는다(`0027` 11-06) — 읽는 쪽 규칙(가장 늦은 거래일만)으로 막았다. 수집이 그 업종을 왜 멈췄는지는 유니버스 변동(그 종목이 빠짐)으로 보인다 — 지우지 않는다
- 루트 회고 `requirements/reports/retrospects/FE-066-067-search-header.md`

## 2026-11-12 — F017 단계 6 덧붙임

- 이 REQ 의 코드에 측정 태그 칸을 더했다(덧붙임 — 없거나 실패면 이전과 같은 화면). 새 교훈은 주인 REQ(`SRV-REQ-053` 회고)에

## 단계 D(2026-11-12)

- 실패 시도도 행으로 둔 게 "같은 지문 LLM 1회"의 근거가 됐다 — 성공만 저장하면 검사가 막은 지문을 회차마다 다시 부른다
- 게이트와 문장의 짝을 CHECK 로(ok ⇔ 문장 · 인용 ≥1) — 코드가 틀려도 표가 막는다

## F017 v4 순서 1b 짝 (2026-11-13)

- `kr_flow_intraday` 보관 7 → 35일(`KR_FLOW_INTRADAY_RETENTION_DAYS`) — 스키마 변경 0 · 정리 배치가 다음 회차부터 덜 지운다(유니버스 50 × 하루 약 40행 × 35일 ≈ 7만 행)
- 회고 본문은 루트 `requirements/reports/retrospects/F017-v4-stage1-panel.md`

## 2026-11-14 — F017 v4 2a 걸침

- 머리 주석이 이 REQ 를 가리키는 파일을 `SRV-REQ-058` 이 걸쳤다 — 동작 변경은 위 체크리스트 한 줄뿐
