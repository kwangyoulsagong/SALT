# DB-REQ-041 — 회고

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06)

- VI 표에 마스터 FK 를 걸려다 실측 응답에서 ETN(Q 접두) 코드를 보고 뺐다 — 걸었으면 회차마다 그 행들이 FK 로 실패했다
- 시장 조치 upsert 를 "끝은 한 번 보면 지우지 않는다 · feed 가 inferred 를 이긴다"로 두어 실측 원천이 들어와도 표를 바꾸지 않는다

## 단계 B(2026-11-06)

- 연결 표에 게시 시각을 같이 둬 "한 종목 오늘 제목"이 인덱스 하나 + PK 조인으로 끝난다(0.14ms)
- 첫 마이그레이션 FK 를 이름 없는 인라인으로 썼다가 `prisma migrate diff` 가 이름 · ON UPDATE 차이를 잡았다 — 커밋 전이라 로컬에서 되돌리고 이름 붙인 제약으로 다시 적용. **새 FK 는 Prisma 기본 이름(`<표>_<열>_fkey`) · `ON UPDATE CASCADE` 로 쓴다**
- 장중 수급 표는 원천이 있는 프로그램 열만 — 빈 열을 미리 만들지 않았다
