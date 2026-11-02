# F008 슬라이스 — 해설 공급자 라우팅 · 진짜 스트리밍 — 검증

범위: `requirements/specs/done/F008-explain-llm-routing-slice.md`. 영역: `salt-server/requirements/reports/checklists/SRV-REQ-050.md` · `bff/.../BFF-REQ-050.md` · `salt-microFe/.../FE-REQ-059.md` · 파일만 걸침 각 REQ §F008 해설 공급자 라우팅

## 코드 검증

| 항목 | 결과 |
|---|---|
| 서버 | `build` · `lint` · `test` **913 / 0** · `test:layer-check` · `prisma validate` · Swagger 생성 · 고아 0 변이 |
| BFF | `build` · `test` **302 / 0** |
| 프론트 | `check-types` · `lint` · `test`(core 51 · ui 43) · `test:layer-check` · `web build`(3.06 kB · 137 kB 그대로) · `web-tax build` |
| 훅 사후 실행 | 바뀐 · 새 `.ts`/`.tsx` 전부(서버 · 프론트 훅) exit 0 |
| 문자열 스캔 | 서버 문자열 리터럴 1,544개 — 새 권유 규칙에 실사용 문장 0 |

## 실데이터 · 실화면

| 항목 | 결과 |
|---|---|
| 실스택 | 임시 사용자 · 소유자 이메일 · LINK 단타: 웹 → `local_claude` 첫 문장 1.85초 · 17문장 · 걸림 0 / 모바일 → Gemini(429) → 템플릿 |
| 실화면 | 3100 · 정식 초대 가입 임시 계정: 4.7~16초 0.25초마다 글자 증가 · 끝 문구 · route 6종 문구 |
| 정리 | 계정 6→5 · 원장 7→3 · 초대 7→6 · `.env` 원복 · 3100 종료 |

## 블라인드 평가 (FR-11)

| 회차 | Claude : 템플릿(다수결) |
|---|---|
| 1 | 1 : 16 — 평가지 관찰 기간 누락 |
| 2 | 16 : 1 |
| 3 | 17 : 3(새 프롬프트로 처음부터 · opus 19:1 · sonnet 17:3 · haiku 1:19) — 라벨 누출 1건 고침 |

## 미검증

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| Codex 평가지 · 실스트림 | 이 맥은 Claude 를 고른다 | `COACH_LLM_LOCAL=codex` 평가 때 |
| 앱 실기기(mobile 경로) | 실기기 QA | `QA-001` |
