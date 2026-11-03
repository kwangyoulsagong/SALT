# 돈 관리 앱 S0 — Kotlin 플랫폼 — 체크리스트 (루트)

슬라이스 `requirements/specs/in-progress/MONEY-S0-platform-slice.md` · 2026-11-03 · `feat/srv-req-043-s0-platform`(base `0b2e4469`)

## 1. 커밋

- `fafb6a0d` feat(platform) — `salt-platform/` 첫 판 + `contracts/events`. **되돌리려면 이 커밋 + `405e5683`**(새 디렉터리라 다른 영역 영향 0)
- `4bc746f1` feat(bff) — 라우팅 스위치 · 그림자 · 골든 · traceparent. 서버 호출 한 곳(인터셉터)이라 되돌리기 = 이 커밋 + `cc184c3a`
- `405e5683` fix(platform) — 코드 리뷰 4건 · FR-8 기본값 · 지표 · Compose BFF · Jaeger · 계정 되돌리기
- `cc184c3a` fix(bff) — 코드 리뷰 6건 · BFF 이미지 · 기존 결함(빌드가 전역 tsc 에 기댐)
- 문서 커밋(REQ 4 · 걸린 REQ · 규칙 3 · ADR 2 · 루트 3종)

## 2. 검증 (최종 HEAD)

| 확인 | 결과 |
|---|---|
| `./gradlew check` | 31 / 0(커널 9 · 경계 8 · 종단 14) · Postgres 17 로 같은 31 |
| 경계 변이 | 5회 모두 해당 규칙에서 실패 → 사본 복원 → 통과 |
| BFF `npm test` · `build` | 347 / 0 · 통과 |
| 골든(Express :4000 녹화 4) | 바이트 일치 — 토큰 없는 없는 경로 404 포함 |
| Compose 실측 | platform · Postgres · RabbitMQ · BFF · Jaeger. Express 서명 토큰 · ping 종단 400ms · 같은 추적 ID · Jaeger 한 추적 span 9 · 컨테이너 BFF → Express 200 · → platform 201 |
| 실행 jar | `kotlin-reflect` 누락 결함(테스트 통과 · 기동 실패) → 수정 · 기동 |
| 계정 스크립트 | 버리는 Postgres 14: 2회 적용 멱등 · 되돌림 왕복 · 기존 `forecast` 유지 |
| 코드 리뷰(high) | 10건 → 10건 사실 확인 · 수정 · 회귀 테스트(`405e5683` · `cc184c3a`) |
| 상시 프로세스 | BFF :4001 · 웹 :3000 200 · launchd 6 그대로(코드 변경은 BFF 인터셉터 — 기본 표 `/platform` 만) |

## 3. 걸린 REQ

| REQ | 무엇 | 기록 |
|---|---|---|
| `SRV-REQ-043` · `044` · `DB-REQ-036` · `BFF-REQ-045` | 이번 몫 | 스펙 · 체크리스트 · 회고 |
| `BFF-REQ-025` · `050` · `007` | 파일 걸침(서버 호출 클라이언트 · 헤더 · `app.ts` 미들웨어) | 스펙 이력 · 체크리스트 · 회고 한 줄 |
| `FC-REQ-025` | 예측 직접 읽기 4곳 → 6개 표 7곳 정정 · 뷰 하나 | 스펙 FR-3 · 이력 |
| `ADR-006` · `ADR-007` | "public 직접 읽기 4곳" 그 자리 정정 | 본문 |
| `SRV-REQ-036` · `SRV-REQ-048` | 주석에서 이름만 — 변경 없음 | 이 줄 |
| `OPS-001` · `OPS-002` | 넘긴 몫(CI · 레지스트리 · 수집처 · 경보) / `ops/salt.sh` 변경 없음(platform 은 상시가 아니다) | 이 줄 |
| `FEATURE-012` · `013` · `008` | 기획서 이력 | 이력 |

## 4. 로컬 운영 DB 에 서비스 계정 · 스키마

**적용 2026-11-03**(사용자 "너가 다해줘") — 롤 덤프 백업 뒤 `roles.sql`: 서비스 스키마 9 + `ping` · 계정 10(`svc_ping` 만 로그인) · `forecast` 주인 postgres 그대로 · `public` 42 표 그대로 · `svc_ping` 의 `public.users` 읽기 권한 오류 · 서버 · BFF 200 · Prisma 상태 일치. 되돌리기는 아래 주석의 `roles-rollback.sql`.

~~권한 확인(공유 DB 변경)에서 막혀 실행하지 않았다.~~ 사전 확인은 끝(접속 = `postgres` 슈퍼유저 · `public` · `forecast` 주인 postgres · `public` CREATE 는 이미 PUBLIC 에 없음 → 서버 · 예측에 영향 없음).

```bash
cd salt-platform
U=$(grep -E '^DATABASE_URL=' ../salt-server/.env | cut -d= -f2- | tr -d '"' | sed 's/?.*//')
pg_dumpall -d "$U" --roles-only -f /tmp/salt-roles-before.sql          # 되돌림 기준
PW=$(openssl rand -hex 16); echo "LOCAL_DB_PING_PASSWORD=$PW" >> .env
psql "$U" -v ON_ERROR_STOP=1 -v ping_password="$PW" -f db/roles.sql     # 되돌리기: -f db/roles-rollback.sql
```

## 5. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| ~~로컬 운영 DB 적용~~ | **적용 2026-11-03**(§4) | 닫힘 |
| 이벤트 13종 스키마 | 발행 서비스가 없다 — 본문은 그 서비스 REQ | S1~S6 |
| Resilience4j 인스턴스 연결 | 외부 호출 없음(기본값 · 테스트는 끝) | S5 |
| 이중 토큰 · 410 이전 | 그 단계 | S3 · S7 |
| CI · 레지스트리 · 배포 수집처 · 경보 | 배포 환경 없음 | `OPS-001` |
| platform launchd 상시 | 화면 경로가 없다 | S1 |
