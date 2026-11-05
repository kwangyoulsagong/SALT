# DB-REQ-039 — 회고

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- **판단**: 본문은 DB 에 두지 않는다 — 원문 파일이 주인이고 DB 는 메타 · 해시 · 이력. 고치는 길이 PR 하나라 검수 = 리뷰.
- **판단**: 겹침 금지는 exclusion constraint 대신 트리거 — `btree_gist` 확장은 관리자만 만든다. 서비스 스키마 안에서 끝나는 쪽을 골랐다.
- **실수**: 트리거 본문에 표 이름만 적어 관리자 psql(다른 search_path)에서 42P01 — `TG_TABLE_SCHEMA` 로 찾게 고쳤다.
- **Action**: 트리거 · 함수 본문의 표 이름은 세션 search_path 에 기대지 않는다(`TG_TABLE_SCHEMA` · `%I`).

## 2026-11-05 — 금융 팁 S2b(`MONEY-S2b-tips-quiz-diff`)

- **판단**: 마이그레이션 둘(표 · 열)을 한 파일에 — 둘 다 더하기만이라 되돌리기가 drop 두 줄. 목적 하나 원칙의 예외를 파일 머리에 적었다.
- **판단**: 경합은 한 문장 UPSERT(`attempts + 1` · `coalesce(correct_at, excluded)`) — 오류 코드를 잡지 않는다.
- **Action**: 없음

## 2026-11-05 — 금융 팁 S2d(`MONEY-S2d-tips-my-numbers`)

- 몫: 스키마 변경 없음(트리거 종류는 text).
- **Action**: 없음
