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

## 2026-11-03 — MONEY-S1a 저축 서비스 첫 판 · 저축 zone 첫 화면

- 이 REQ 에 걸린 몫(`3e5e0d42`): 라우팅 표에 첫 화면 경로 `/savings` → platform. 그림자 단계는 건너뜀 — 옛 경로를 Kotlin 으로 다시 만들지 않아 비교할 짝이 없다(`SRV-REQ-045` FR-1 정정). 되돌리기 = 표 한 줄은 그대로지만 데이터는 이미 savings 가 주인
- 확인: Kotlin `./gradlew check` 56(저축 종단 10 · 경계 8 · 플랫폼 14 · 도메인 15 · 커널 9) · bootJar 로컬 운영 DB 기동 · 서버 build · lint · test 936 · test:layer-check · BFF build · test 351 · 모노레포 check-types · lint · test(core 83 · ui 43) · zone 5 운영 빌드 · 훅 사후 실행 · 실스택(BFF 4001 → Kotlin 4010 → 로컬 DB) · 실화면 3화면 × 4폭(1024 · 1280 · 1440 · 1600) 넘침 0 · 콘솔 오류 0 — 루트 `requirements/reports/checklists/MONEY-S1a-savings-calculator.md`

## 2026-11-04 — 가계부 S1a(`MONEY-S1-household-entry`)

- [x] 실스택: BFF 4001 → 라우팅 표 → Kotlin 4010 (`PUT /budget` · `POST /expenses` · `POST /parse` · 홈)

## 2026-11-04 — 추적 ID 테스트 실패 고침(`15177092`)

- [x] 원인 실측: 테스트 한 번에 `trace.ts` 로드 2회(같은 파일 · 다른 인스턴스) → 인터셉터 시점 저장소 비어 새 추적 ID
- [x] 고침 뒤 스위치 테스트 5/5 · BFF 전체 362/362 · `npm run build`
- [x] 변이(`outgoingTraceparent` 가 들어온 ID 무시) → 이 테스트 실패 1 · 되돌림 diff 0
- [x] 실행 중 스택: `traceparent` 를 실어 BFF 4001 → Kotlin 로그 `traceId` 같은 값


## 2026-11-05 — FE-REQ-013 FR-80 2단계 쿠키 세션

- `app.ts`(이 REQ 가 머리 주석 주인)에 쿠키 → Authorization 미들웨어 한 줄(`fb9c85b3`, `BFF-REQ-009` FR-54)
- 확인: check-types · lint · test · zone 4 빌드 · 훅 사후 실행 · 실스택 — `salt-microFe/requirements/reports/checklists/FE-REQ-013.md` 2026-11-05

## 2026-11-05 — 금융 팁 S2a(`MONEY-S2a-tips-content`)

- 몫: 라우팅 표에 `/content` → platform 한 줄(금융 팁 `/api/app/tips`). 스위치 · 그림자 동작 무변경
- 검증: 슬라이스 검증 그대로(`requirements/reports/checklists/MONEY-S2a-tips-content.md`) — 이 REQ 의 수용 기준은 바뀌지 않았다
- 미검증: 없음(이 몫 안)
