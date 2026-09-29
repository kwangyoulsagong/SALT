# F010 target-weight@2 — 체크리스트 (2026-09-29)

영역: `salt-forecast/.../FC-REQ-013.md` · `salt-server/.../SRV-REQ-024.md` §14 · `DB-REQ-029.md` FR-21 · `bff/.../BFF-REQ-041.md` FR-4~6 · `salt-microFe/.../FE-REQ-042.md` FR-9~13 · `FE-REQ-040.md` FR-11~13

| 확인 | 결과 |
|---|---|
| 사전등록 | `2e28f15`(결과 전) 이후 파일 무변경 · DB `target-weight@2` 1행 · 실행 코드 `95dea9b` 도 결과 전 커밋 |
| 결과 | a 0.10 · 0.20 전부 ✗ → 채택 없음. 탐색(a 0.05 · 알트 상위 3)도 전부 음 |
| 예측 | ruff · pyright 0 · lint-imports 3 kept · pytest 162 · 누수 19 · 라이브 작업 실행 0행(첫 월요일 전) |
| DB | 마이그레이션 로컬 적용 · 스키마 계약 테스트 · 뷰 EXPLAIN PK Index Scan 0.015ms |
| 서버 | `npm test` 555 / 0 · tsc · lint · 어댑터 실 DB 호출 `null` |
| BFF | `npm test` 198 / 0 · tsc · lint |
| 프론트 | check-types · lint · test(ui 43 · core 26) · layer-check · web build(`/investments` 132 → 132 kB) · Chrome 실제 계정(띠 → 리포트 앵커) · Playwright 1440 · 360 고정 데이터 axe 0 · 띠 · 카드 가로 넘침 0 |
| 첫 화면 | 1440×772: 요약 띠 108px · 시세 표 647px (전: 카드 876 + 460 · 표 1890px) |
| 계약 | **BREAKING** 서버 응답: 보유 알트 `rows` → `excluded`(`no_record`) · `status` `no_room` · 새 필드 `gapCapped` · `outsideRuleWeight` · `fundable` · `altShare` · `live` · `recordSource`. BFF · core 타입 · FE 같은 브랜치. 새 뷰 `v_target_weight_live`. `.claude/rules` 위젯 설명 2곳 |
| 공통 수용 기준 | ① 요약 한 줄에도 근거 · 과거 성적 · 실패 사례 ② 주문 경로 0(`orderExecution: false`) ③ 비중 · 금액 · 부족분 축소 전부 서버 ④ 명령형 · 확신 0 — 알트 문구는 "없어요 · 줄이라는 뜻이 아니에요" |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 라이브 원장 실제 행 · late 판정 · 결과 | 첫 리밸런스 2026-10-05 | 2026-10-12 |
| 라이브 30주 화면 | 등록 [live.display] | 2027-05 전후 |
| 인증된 HTTP · 실제 계정 알트 보유 화면 | 로컬 토큰 없음 · 이 계정 보유 없음 | 로그인 QA(사용자) |
| 360 페이지 가로 넘침 | 시장 요약 카드(이전부터) | 시장 요약 반응형 정리 |
| web-tax 빌드 · storybook | 이 변경이 건드리지 않는다 | 해당 변경 시 |
| 운영 DB | 로컬만 | 배포 시 |
| 생존 편향 | 상장폐지 종목 수집 안 함 | 없음(고지) |
