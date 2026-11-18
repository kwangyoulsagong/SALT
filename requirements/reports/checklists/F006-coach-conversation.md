# F006 코치 대화 1단계 — 체크리스트

| 영역 | 검증 | 결과 |
|---|---|---|
| DB | 마이그레이션 `20261118300000_coach_conversation` 로컬 적용 · 스키마 ↔ DB 차이 0(대화 표) · 등급 주석 · `userRows` 목록 | pass |
| 서버 | build · lint · layer-check · test **1858/1858**(새 규칙 시험 60 · 유스케이스 7 — 재연결 · 겹친 스트림 · 60초 · 재료 실패 · 남의 것 404) · 검사기 전수 시험(규칙 문장 리터럴) | pass |
| BFF | build · test **522/522**(중계 · `id` · 모르는 링크 버림 · 빈 질문 · SSE 파서 `id`) | pass |
| FE | check-types 13 · lint 13 · `@repo/core` 299 · `@repo/ui` 63 · layer-check 16+10 | pass |
| 실데이터(API) | 임시 계정 + 브랜치 서버 4020 · BFF 4011 — 빈 계정 여섯 갈래 · 거래 넷 + 위험 예산 뒤 네 칩 · `Last-Event-ID: 0` 재연결(다음 문장부터 · `replayed`) · 첫 이벤트 0.005~0.51s | pass — 결함 둘 찾아 고침(손익률 −1802.2% → −18.0% 단위 · "원로 · 원를 · BTC 이" 조사) + "손실 제한 검토 지점 근처" 문구 |
| 실화면 | 설치 Chrome · 1280 데스크톱 · 390 앱 웹뷰 UA — 칩 → 답 · 자유 질문 → 답 · 링크 넷 · 새로고침 뒤 이어 보기 · 콘솔 오류 0 · 가로 넘침 0 | pass(첫 페인트 4.1s 는 dev 첫 컴파일 — 두 번째 0.5s) |
| 실화면 실패 경로 | Playwright `route` — POST 429 → 문구 · 입력 보존 / 스트림 끊김 4회 → "다시 받기" / 다시 받기 = 같은 답 id(질문 POST 늘지 않음) | pass |
| 계정 삭제 | 임시 계정 지우기를 브랜치 경로로 — `coach_messages` 34 · `coach_conversations` 1 지움 · 사람 표 0 확인 · 초대 코드 지움 | pass |
| `node scripts/check-done.mjs` | | 커밋 전 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 카드(`message.card` · 3종 게이트) | 이번 답은 저장 추천을 싣지 않는다(링크만) | F006 대화 2단계 |
| LLM 다듬기 | 블라인드 A/B 가 먼저(해설 결과) | 별도 REQ — 대화 답 A/B |
| 위로 더 읽기 · 아래 자동 스크롤 · 첫 메시지 브리핑 카드 | 이번 판은 최근 30개 + 맨 아래 입력 | F006 대화 2단계 |
| 국내 주식 팔기 답 | 익절/손절 계획이 코인만(`ListProfitPlans` crypto) | 국내 계획이 생길 때 |
| main 서버 · BFF 반영 | 머지 뒤 `ops/salt.sh restart server bff-rest` | 머지 뒤 |
