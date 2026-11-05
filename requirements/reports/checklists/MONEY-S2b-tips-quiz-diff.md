# MONEY-S2b-tips-quiz-diff — 체크리스트

## 2026-11-05 — 구현 · 확인 · done

커밋 `d2d662d4`(서버 content) · `4b5a294b`(BFF) · `d59efa9c`(FE). 영역 체크리스트: `salt-server/.../SRV-REQ-047.md` · `DB-REQ-039.md` · `SRV-REQ-044.md` · `bff/.../BFF-REQ-049.md` · `salt-microFe/.../FE-REQ-058.md` · `FE-REQ-009.md` · `FE-REQ-010.md`.

### 수용 기준 — 각 REQ 그대로(이번에 바뀐 기준 없음)
- `DB-REQ-039` 2/2 · `SRV-REQ-047` 3/3 · `BFF-REQ-049` 2/2 · `FE-REQ-058` 3/4(LCP 미측정 — S2a 와 같음)

### 검증(최종 HEAD)
- 서버 `./gradlew check` — 앱 79(content 종단 7 — 새 2) · 도메인 `ContentSpec` 8 + `QuizDiffSpec` 11 · 원문 `CatalogSpec` 3 · Modulith · ArchUnit · 실 Postgres · RabbitMQ / `bootJar` 실행 jar → 로컬 운영 DB(Flyway V2 적용 · 퀴즈를 더한 글 다섯이 "읽기 전에 맞혀 보기 문제 추가" 이력 한 줄씩)
- BFF `npm run build` · `npm test` 395
- FE `check-types` · `lint` 13/13 · `test`(core 171 · ui 46) · `test:layer-check` 16/10 · 훅 사후 27파일 0 · `web-tips` 빌드 main 과 나란히(별도 worktree): `/tips` 143 → 144 · `/tips/[slug]` 107 → 115 · `/tips/cards` 146(새) kB
- 실화면(셸 3001 → 팁 3005 · 임시 사용자 · 공개 플래그 · BFF 3001 origin 은 확인 동안만): 비로그인 채점(정답 DOM 0 · 틀림 · 다시 풀기 · 맞음 + 로그인 안내) · `/tips/cards` 로그아웃 안내 · noindex / 로그인 "5문제 중 0장" → 맞음 "카드에 담았어요" → 다시 "이미 모은 카드예요" → 모음 "5문제 중 1장" / 줄 diff(임시 이력 행 `<del>` 1 · `<ins>` 1) / 360 · 390 웹뷰 · 1280 넘침 0 / 콘솔 오류 0 / axe 새 요소 위반 0
- 실패 · 늦음(`route`): 카드 500 · 늦음 스켈레톤 · 채점 500 → 문구 · 다시 누를 수 있음
- 실화면 결함 둘(고침): 퀴즈 칸 폭 16px 어긋남 · 이력 · 모은 날 UTC 날짜
- 번들 결함 하나(고침): 엔티티 배럴의 브라우저 요청이 공개 서버 페이지에 딸려 감(143 → 147)
- 정리: 확인용 이력 행 · 임시 풀이 행 삭제(`quiz_answer` 0) · 공개 플래그 · `WEB_ORIGINS` 해제 → `public:false` 확인 · 3001 · 3005 · worktree 내림

### 미검증 · 범위 밖
| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| LCP 2.5s(휴대폰 폭) | 운영 빌드 · 휴대폰 폭 측정 전 | 법무 확인 뒤 공개 직전 |
| `quiz_answer` 조회 `EXPLAIN` | 표가 비어 있어 의미 있는 계획이 안 나온다(사용자 ≤10) | 공개 뒤 행이 쌓일 때(공개 직전 LCP 와 같이) |
| 법무 확인 · 법령 원문 대조 | 사용자 결정 | 확인 기록 시 |
