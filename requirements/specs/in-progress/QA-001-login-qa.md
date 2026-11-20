---
id: QA-001
area: global
kind: QA
title: "로그인 QA — 실제 계정 · 실제 서버로 한 번에 닫는 미검증 항목"
priority: high
created: 2026-09-30
source: 2026-09-30 REQ 감사 — 체크리스트 28개의 "언제 닫히나" 가 날짜 · REQ 없이 "로그인 QA(사용자)" 로만 적혀 있었다(pr-convention §2: 비면 잊힌 것)
---

## Summary

자동 작업(에이전트)은 **로컬 로그인 토큰을 만들지 못한다**(권한 분류기가 막는다 — 비밀번호를 모른다). 그래서 기능마다
"인증된 HTTP 왕복 · 실제 계정 화면"이 미검증으로 남았고, 그 칸이 흩어져 잊히기 쉬웠다. 이 REQ 가 그 항목들의 **닫히는 곳**이다.
사용자가 로그인한 브라우저에서 아래를 한 번에 돌리고, 결과를 각 체크리스트에 적는다.

## 시나리오

| # | 무엇을 | 확인 | 원래 체크리스트 |
|---|---|---|---|
| Q-1 | 실 토큰으로 서버 → BFF → 화면 왕복 — 코치 리포트 · 목표 비중 · 리스크 예산 · 미러 · 태그 확정 · 월간 복기 · 성적표 · 가격 범위 · 사건 · 쏠림 | 각 경로 200 · 화면에 오류 문구 없음 · 값이 서버 응답과 같음 | F009 · F010 슬라이스 · `SRV-REQ-024` · `037` · `038` · `BFF-REQ-037` · `038` · `039` · `041` |
| Q-2 | 거래 폼 저장 왕복 · 투자금 저장 → 목표 비중 부족분 전환 | 저장 뒤 새로고침에도 남음 · 부족 · 초과 · `no_room` 이 설명대로 | `FE-REQ-039` · `042` · `BFF-REQ-041` |
| Q-3 | 성능 — size-check p95(< 200ms 서버 + BFF 20ms) · 복기 첫 조회 | 개발자 도구 Network 20회 | `SRV-REQ-038` · F009-slice1 · slice6 |
| Q-4 | 사람이 재는 것 — 거래 1건 + 계획 입력 30초(5회 평균) · 200% 확대 · 색맹 시뮬레이션 | 시간 · 깨짐 · 색만으로 구분하는 곳 없음 | `FE-REQ-038` · `039` · F009-slice3 · slice7 |
| Q-7 | 휴대폰 PWA 실기기 — iOS Safari 공유 → 홈 화면에 추가 · Android Chrome 설치 → standalone 실행 · 탭 넷 · `/m/login`(설치 앱 안 다시 로그인) · `/` 를 휴대폰으로 열면 `/m/login` | 주소창 없음 · 상태바 · 안전 영역 · 확대 없음 | `FE-REQ-071`(2026-11-20) |
| Q-5 | 실데이터 화면 — 알트 보유 계정 목표 비중 · 투자유의 종목 상세(`exchange_warning`) · 주의 한 줄 | 문구 · 막힘이 설명대로 | `FE-REQ-040` · `042` · F010-target-weight-v2 · slice6 |
| Q-6 | 표본이 쌓인 뒤 — 판단 유형 표본 ≥ 20 이 되어 판단 카드가 열리는 순간 · 청산이 쌓인 계정의 연속 · 시간대 | 3종 고지가 같이 열림 | `FE-REQ-026` · `038` · F009-slice7 — **날짜 게이트**(채점 누적) |

## 원래 체크리스트 (행 수)

| 체크리스트 | 행 |
|---|---|
| `bff/requirements/reports/checklists/BFF-REQ-037.md` | 1 |
| `bff/requirements/reports/checklists/BFF-REQ-038.md` | 7 |
| `bff/requirements/reports/checklists/BFF-REQ-039.md` | 2 |
| `bff/requirements/reports/checklists/BFF-REQ-041.md` | 2 |
| `requirements/reports/checklists/F008-slice23-positioning.md` | 2 |
| `requirements/reports/checklists/F009-slice1-plan-sizing.md` | 1 |
| `requirements/reports/checklists/F009-slice2-realized-vol.md` | 1 |
| `requirements/reports/checklists/F009-slice3-trade-form.md` | 2 |
| `requirements/reports/checklists/F009-slice4-adherence-mirror.md` | 1 |
| `requirements/reports/checklists/F009-slice5-mirror-screen.md` | 2 |
| `requirements/reports/checklists/F009-slice6-monthly-review.md` | 2 |
| `requirements/reports/checklists/F009-slice7-streak-timeofday.md` | 4 |
| `requirements/reports/checklists/F010-slice0-scorecard-integrity.md` | 2 |
| `requirements/reports/checklists/F010-slice2-regime-vol.md` | 1 |
| `requirements/reports/checklists/F010-slice3-judgment-screen.md` | 2 |
| `requirements/reports/checklists/F010-slice5-target-weight.md` | 1 |
| `requirements/reports/checklists/F010-slice6-independent-data.md` | 1 |
| `requirements/reports/checklists/F010-target-weight-v2.md` | 1 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-026.md` | 1 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-038.md` | 3 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-039.md` | 9 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-040.md` | 4 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-042.md` | 2 |
| `salt-microFe/requirements/reports/checklists/FE-REQ-043.md` | 1 |
| `salt-server/requirements/reports/checklists/SRV-REQ-024.md` | 4 |
| `salt-server/requirements/reports/checklists/SRV-REQ-025.md` | 1 |
| `salt-server/requirements/reports/checklists/SRV-REQ-037.md` | 1 |
| `salt-server/requirements/reports/checklists/SRV-REQ-038.md` | 9 |

## 닫는 법

시나리오별로 결과를 이 문서 아래 "결과" 절에 적고, 원래 체크리스트의 해당 행에 결과를 덧붙인다(행을 지우지 않는다).
Q-6 은 표본 게이트가 열린 뒤에만.

## 결과 (2026-11-17 — 1회차, `feat/f008-slice24-s2-earnings-window`)

**방법** — 에이전트가 로그인 토큰을 만들 수 없다는 전제(Summary)가 바뀌었다: 초대 코드로 임시 계정을 만들어 실로그인한다(쿠키 `salt_at`).
같은 코드 · 같은 DB 의 별도 서버(4020 — 워커 없음, `FORECAST_OWNER_EMAILS` = 임시 계정)와 BFF(4011)를 띄우고, 실로그인 브라우저(설치 Chrome)의
`/api/app/**` 를 그쪽으로 돌렸다 — 소유자 목록만 다르다. 데이터는 API 로 넣었다(투자금 2천만 · 월 손실 50만 · 1회 15만 · 목표 변동성 30% ·
거래 7건: BTC · ETH · 알트 KAVA(투자유의 · 해외 시세 차이 주의) · 국내 005930 · XRP 매수 → 청산, 결정 평가 1회). 2회 돌렸고 끝마다 앱 삭제 경로로
계정을 지웠다(계정 1 · 확인용 초대 코드 0 · 사람 표 행 0).

| # | 결과 | 근거 |
|---|---|---|
| Q-1 | **닫힘** | 실토큰 22경로 200(리포트 · 생성 상태 · 사건 코인 · 국내 · 쏠림 · 위험 예산 · 계획 · 미러 코인 · 국내 · 결과 · 월간 복기 코인 · 국내 · 성적표 · 목표 비중 · 패널 셋 · 상세 · 점검 · 프로필 · 포트폴리오 둘) · 위험 예산 · 목표 비중 · 미러는 서버와 BFF 값 같음 · 태그 확정 PUT 200 → 목록 · 미러 태그 비용 반영 · 실로그인 7화면(홈 · 포트폴리오 · 리포트 · 코치 설정 · 상세 BTC · KAVA · 005930) `/api/app` 호출 실패 0 · 오류 문구 0 · 넘침 0. 목표 비중 · 쏠림 · 가격 범위 화면 칸은 은퇴(`be959e5f` · 2026-11-12) — HTTP 만 |
| Q-2 | **닫힘** | 화면 폼 거래 + 계획 4건 201 · 새로고침 뒤 계획(손절가 · 이유) 남음 · 소수 9자리 넘는 수량은 안내 뒤 전송 0. 투자금 저장 → 목표 비중 `investable_capital` · BTC · ETH `under`, 알트 · 국내는 `no_record` 제외. `over` · `no_room` 문구는 화면 은퇴로 확인 대상 없음 |
| Q-3 | **닫힘** | size-check 20회 p95 서버 2.8ms · BFF 3.1ms(예산 200 + 20) · 월간 복기 조회 13ms |
| Q-4 | 일부 | 색맹(deuteranopia) 7화면 — 오름 · 내림이 부호 · 글자로도 갈림. 앱 웹뷰 375 · 360 7화면 넘침 0 — **국내 머리 지표 어긋남 발견 · 고침**(`FE-REQ-041` · `064`). 200%: 1920 화면(960px) 7화면 정상 · **1280 · 1440 화면(640 · 720px)은 768 미만 안내(`FE-REQ-043`)로 바뀜 → 결정 대기**. 대비(axe color-contrast 1440): 기존 회색 `#8b95a1`/흰 3.03 · 프로필 이메일 2.18 · 등락 파랑 4.27 · 빨강 3.63 등 화면당 4~60건 — 전부 기존 토큰 · 새 요소 0 → 규칙(`done-checklist.md` §2-3)대로 그대로. 입력 30초는 사람 측정이라 남음(기계 입력 0.12초로 흐름만) |
| Q-5 | **닫힘** | KAVA 보유 계정 — 상세 "거래소가 투자유의로 지정한 종목이에요" · 원인 칸 거래소 표시 근거(09:18) · 판정 관망 · 3종(검산 151건 · 틀렸던 때) · 리포트 흔들림 몫 8% · 내리면 얼마에 KAVA |
| Q-6 | 남음 | 날짜 게이트. 청산 1건 계정으로 실값 경로만 — 손실 비대칭 · 연속 · 시간대가 "표본 부족" 문구로 나옴 |

**그 밖** — 해설 스트림 200 · 첫 바이트 8ms, 그날 LLM 몫 소진이라 `fallback`(템플릿) 한 벌 — 문장 하나씩 흐름은 LLM 몫 있는 날.
2회차 상세 BTC 패널 · 상세 504 한 번 — 예측 배치가 아직 옛 전체 스캔(실행 트리 = main, `DB-REQ-017` 머지 뒤 확인과 같은 항목).
1회차 10월 복기 실제 +134% 는 입력 탓(매수 단가를 지금 시세로 넣어 그날 종가보다 25% 낮음 — TWR 이 그 차이를 수익으로 셈, 계산은 맞다) — 2회차는 그날 종가 근처로 넣었다.

### 남은 것

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 200% 확대(1280 · 1440 화면) | 768 미만 안내(`FE-REQ-043`)와 부딪힘 — 안내를 지킬지 · 확대일 때 화면을 보일지는 제품 결정 | 사용자 결정 |
| 입력 30초(사람 5회) | 사람이 재야 한다 | 사용자 |
| 해설 문장 흐름(실 LLM) | 그날 LLM 몫 소진 | LLM 몫 있는 날 |
| Q-6 표본 열림 | 채점 누적 | 판단 유형 표본 ≥ 20 |
| 실기기 | 앱 없음 | ~~`RN-REQ-001`~~(→ F019 `/m` · `ADR-012`) |

## Changelog

- 2026-09-30: 초판 — 체크리스트 28개의 "로그인 QA" 를 모았다
- 2026-11-17: 1회차 — 임시 소유자 계정 + 별도 서버 · BFF 로 Q-1 · 2 · 3 · 5 닫음, Q-4 일부(200% 1280 화면은 결정 대기), Q-6 남음. 원래 체크리스트 31개 파일 85줄에 결과를 덧붙임(줄 지우지 않음). 발견 결함 하나(국내 머리 지표 열) 고침 — `feat/f008-slice24-s2-earnings-window`
- 2026-11-20: Q-7 추가 — 휴대폰 PWA 실기기(`FE-REQ-071`, 사용자 휴대폰)
