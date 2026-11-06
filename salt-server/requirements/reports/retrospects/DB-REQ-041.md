# DB-REQ-041 — 회고

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06)

- VI 표에 마스터 FK 를 걸려다 실측 응답에서 ETN(Q 접두) 코드를 보고 뺐다 — 걸었으면 회차마다 그 행들이 FK 로 실패했다
- 시장 조치 upsert 를 "끝은 한 번 보면 지우지 않는다 · feed 가 inferred 를 이긴다"로 두어 실측 원천이 들어와도 표를 바꾸지 않는다
