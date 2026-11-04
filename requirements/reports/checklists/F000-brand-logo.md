# F000 로고 슬라이스 — 체크리스트

## 2026-11-04 · `25f182f6`

영역 상세는 `salt-microFe/requirements/reports/checklists/FE-REQ-051.md`.

- [x] `FE-REQ-051` FR-1~5 · FR-6(경로 데이터 한 곳)
- [x] 파일만 걸친 REQ 기록 — `FE-REQ-054` · `007` · `005` · `044` · `RN-REQ-001`(스펙 · 체크리스트 · 회고), `FE-REQ-047` 이력(FR-1 로고 칸)
- [x] 검증: check-types 12/12 · lint 12/12 · test(core 169 · ui 43) · `test:layer-check` · 훅 사후 실행 · build-storybook · zone 5 운영 빌드 · `brand:icons --check` · 실화면(1440 글자 로고 61×24 · 900 심볼 24 · zone 5 서버 HTML 에 로고 · 같은 해시 `icon.svg`)
- [x] 문서: 컴포넌트 인덱스 · 스타일 토큰 · 마스터 인덱스(영역 표 · 상태표 · §4-1 · 슬라이스 단락 · §8) · `FEATURE-000` · 디자인 계획 정정

| 미검증 · 범위 밖 | 사유 | 언제 닫히나 |
|---|---|---|
| `ui-native` 로고 | 패키지가 없다 | `RN-REQ-001` |
| 상표 검색 | 사용자 확인 사항 — KIPRIS 자동 조회 실패 | 출시 전 |
| 실기기 홈 화면 아이콘 | 파일 점검(180 불투명 · iOS 마스크 미리보기)은 끝, 휴대폰 추가는 안 했다 | `QA-001` |

- 2026-11-04 번들 main 대조 닫음 — 공용 First Load 다섯 zone 그대로, 머리 있는 페이지 +1~3 kB(상세는 `salt-microFe/requirements/reports/checklists/FE-REQ-051.md`)
