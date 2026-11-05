# DB-REQ-039 — 회고

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- **판단**: 본문은 DB 에 두지 않는다 — 원문 파일이 주인이고 DB 는 메타 · 해시 · 이력. 고치는 길이 PR 하나라 검수 = 리뷰.
- **판단**: 겹침 금지는 exclusion constraint 대신 트리거 — `btree_gist` 확장은 관리자만 만든다. 서비스 스키마 안에서 끝나는 쪽을 골랐다.
- **실수**: 트리거 본문에 표 이름만 적어 관리자 psql(다른 search_path)에서 42P01 — `TG_TABLE_SCHEMA` 로 찾게 고쳤다.
- **Action**: 트리거 · 함수 본문의 표 이름은 세션 search_path 에 기대지 않는다(`TG_TABLE_SCHEMA` · `%I`).
