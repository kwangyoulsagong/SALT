# BFF-REQ-051 — 회고

루트 슬라이스 `requirements/specs/done/F016-A-market-status-tags-slice.md` · 체크리스트 `requirements/reports/checklists/F016-A-market-status-tags.md`

## 단계 A(2026-11-06)

- `/status` 경로를 따로 만들지 않고 띠가 있는 응답 둘에 실었다 — 화면이 부를 곳이 늘지 않고 쓰지 않는 경로가 생기지 않았다. 스펙 FR-2 를 그 자리에서 정정
- 정지 띠는 조용히 사라지면 안 되는 칸이라 모양이 틀린 행은 버리지 않고 던진다 — 모르는 kind 만 버린다

## 단계 B(2026-11-06)

- 경로 둘 — 기존 `read` 헬퍼(재시도 1 · disabled · unavailable 갈래)를 그대로 써서 실패 처리 코드 0줄. 모르는 소식 `kind` 는 버린다
- FR-4 를 "외국인 · 기관 · 개인 · 프로그램"에서 프로그램만으로 정정 — 서버 원천이 없다

## 단계 C(2026-11-09)

- 산술 grep 테스트가 처음엔 문자열 속 하이픈(`why-moved`)을 잡았다 — 검사 대상에서 문자열 · 주석을 빼야 규칙이 선다
- 루트 회고 `requirements/reports/retrospects/F016-C-move-split-facts.md`
