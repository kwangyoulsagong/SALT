# BFF-REQ-045 — 라우팅 스위치 S0 검증 · 2026-11-03

커밋 `4bc746f1`(스위치) · `cc184c3a`(리뷰 6건 · 이미지 · 기존 빌드 결함).

| 항목 | 결과 |
|---|---|
| `npm test` · `npm run build`(최종 HEAD) | **347 / 0** · 빌드 통과(로컬 `typescript@5.8.2` — 전역 tsc 의존 제거) |
| 스위치 · 재로딩 | 값 하나 → 1초 안 반영 · 재시작 없음 · 깨진 파일 · 잠깐 사라진 파일은 직전 표 |
| 쓰기 그림자 금지 | 흉내 서버 둘 — POST · PUT · PATCH · DELETE 4종 platform 0건 |
| 그림자 비교 | 시각 무시 · 숫자 차이 `$.data.total` · 기록에 값 0 · 동시 상한 · 표본 · 비동기 순서 쓰기 |
| 골든 | 녹화 · 재생 · 정규화 · 녹화 주소 = 실제 보낸 주소(axios) · `/auth/*` 녹화 0 · 비밀 키 가림 · 긴 주소 · 비슷한 주소 이름 |
| 게이트 | 비교 0건이면 `shadow:report` · `golden:replay` exit 1(실행 확인) |
| 추적 | traceparent 생성 · 잇기 · 비동기 경계 · 실 BFF 클라이언트 → Compose platform 같은 ID |
| 이미지 · Compose | `bff/Dockerfile`(REST) — 컨테이너 BFF → 호스트 Express 200 · → platform 201 · 되울림 같은 추적 |
| 프론트 계약 | 무변경 — 기본 표 `/platform` 만 platform, 화면 경로 전부 legacy · 상시 BFF :4001 · 웹 :3000 200 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| FR-5 이중 토큰(JWKS) | identity 이전 단계 | S3(`SRV-REQ-048`) |
| FR-8 410 이전 | Express 종료 단계 | S7 |
| 실경로 1주 그림자 리포트 | 옮긴 경로가 아직 없다 | S1 첫 경로(저축) |
| OpenTelemetry SDK span 내보내기(BFF 쪽) | 수집처 없음 — 지금은 traceparent 전달만 | `OPS-001` |
