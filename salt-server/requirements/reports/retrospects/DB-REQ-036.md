# DB-REQ-036 회고 (2026-11-03, S0)

- 모델 수 "42 → 43" 이 낡아 있었다 — 10-30 drop 2 를 이 REQ 에 반영하지 않았다. 셈은 문서가 아니라 `schema.prisma` 를 파싱해서 했다(41).
- 주인 표를 Prisma 호출 위치로 세니 **사용처 0 · 행 0 인 표 셋**(알림 설정 둘 · 실행 기록)이 나왔다. 주인을 억지로 붙이지 않고 drop 후보로 표시했다.
- 경계 참조 목록에서 **FR-7 export 뷰에 없는 예측 읽기(B9 — 보유 ∪ 관심 종목 코드)** 를 찾았다. ADR-007 의 "public 읽기 4곳"도 실제는 6개 표 7곳이다 — 숫자를 적은 문서는 grep 으로 다시 센다.
- 계정 스크립트는 psql `\gexec` 로 멱등하게(DO 블록은 psql 변수를 못 쓴다). 운영 DB 적용은 서비스가 옮겨 오는 S1 로 — 쓰이지 않는 계정을 미리 만들지 않았다.

## Action

- S1 착수 때 B1 · B3 · B4 줄부터 닫는다(savings FK · 프로필 통계 · 온보딩 목표 수)
- B9 뷰는 S5 `FC-REQ-025` 에 행으로 넘긴다

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 걸린 몫은 위 체크리스트 한 줄. 근거 · 판단은 루트 회고 `requirements/reports/retrospects/MONEY-S1a-savings-calculator.md`. Action 없음

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- 계정 · 스키마는 S0 가 NOLOGIN 으로 만들어 둔 덕에 한 줄(ALTER ROLE)로 끝났다.
