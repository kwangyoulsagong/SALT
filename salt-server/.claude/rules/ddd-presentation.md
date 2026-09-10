---
globs: salt-server/src/*/presentation/**
---

# presentation 레이어 — 요청 처리와 응답

Express 라우터와 컨트롤러. 이 컨텍스트가 밖으로 내놓는 **HTTP 노출면**이다.

## 허용 Import

- `../../shared/*` · 같은 컨텍스트의 `domain/*` · `application/*` — 허용
- `infrastructure/*` — **금지** (컨트롤러가 리포지토리를 직접 잡는 것. 훅이 차단)
- **다른 컨텍스트 — 금지** (공개 API도 포함)

컨트롤러 하나가 두 컨텍스트를 엮고 싶어지면 그 조합은 **조합 컨텍스트**의 일이다(`homebriefing` · `onboarding`). 컨트롤러에서 엮으면 트랜잭션 경계와 부분 실패 설계가 사라진다.

## 구조

```
{context}/presentation/
├── {context}.routes.ts     path · 미들웨어 · Swagger 선언만
├── {context}.controller.ts 요청 파싱 · DTO 검증 · 서비스 1회 호출 · 응답 변환
├── dto/                    Zod 스키마 + 요청/응답 타입
└── index.ts
```

기존 `{domain}.routes/controller/service/dto` 4파일 패턴을 유지한다 — `service`만 `application`으로 올라간다.

## 1. 컨트롤러가 하는 일 — 네 가지

1. HTTP 요청을 받는다
2. Zod로 검증하고 **Command / Query로 변환**한다
3. `application`의 유스케이스를 **한 번** 호출한다
4. 결과를 응답 DTO로 변환해 돌려준다

분기·계산·검증 로직이 컨트롤러에 생기면 그것은 유스케이스다. **서비스 호출이 두 개면 그 조합이 유스케이스다.**

## 2. DTO는 도메인 타입을 노출하지 않는다

Aggregate·VO를 그대로 응답에 담지 않는다. 담으면 도메인 리팩터가 곧 API 파괴가 된다.

**금액은 응답 직전에 원 단위 정수로 반올림한다.** 그 반올림이 일어나는 곳은 여기 한 곳이다(`ddd-domain.md` §3).

## 3. 입력 검증

- 형식 검증(필수·범위·enum)은 **여기서** Zod로 한다
- 도메인 규칙 검증(존재 여부, 상태 전이 가능성)은 **도메인·유스케이스**가 한다. 컨트롤러에서 미리 조회해 검사하지 않는다 — 검사와 실행 사이에 상태가 바뀔 수 있다

## 4. 예외 → HTTP 매핑은 한 곳에서

`shared/presentation`의 에러 미들웨어 **하나**가 전부 매핑한다. 컨트롤러마다 try-catch를 두지 않는다.

컨텍스트 도메인 예외는 `shared/domain`의 기반 타입을 상속하고 `code` + `kind`(`NOT_FOUND` · `CONFLICT` · `INVALID` · `BLOCKED`)를 들고 온다. 미들웨어는 그 상위 타입만 본다 — **컨텍스트가 늘어도 미들웨어는 안 늘어난다.**

**도메인 예외 메시지를 그대로 사용자에게 내보내지 않는다.** 사용자 문구는 프론트의 `shared/i18n` 책임이고 서버는 `code`로 식별만 넘긴다.

## 5. 이 제품의 응답 규약

| 규약 | 내용 |
|---|---|
| `degraded` | 계산이 불완전할 때 500이 아니라 `degraded: true` + `degradedReasons[]`로 준다. 원장 불일치 · 일봉 결측 · 환율 결측 |
| `reconciliation` | 청구서 응답은 항등식 잔차를 **항상 포함**한다. 잔차를 숨기지 않는다 |
| 렌더 게이트 | 추천 응답은 `renderable` + `blockedReason`을 담는다. 3종 세트(근거·적중률·실패사례) 중 하나라도 없으면 `false` |
| 계산 전제 노출 | 세금 응답은 세율·공제·시행일·기준일·환율 소스를 `lawConfigShown`으로 함께 준다 |
| 면책 | 세금·추천 응답에 `disclaimer` 문자열을 포함한다 |
| 410 Gone | 동면된 경로는 404가 아니라 **410 + 1회 로그**로 1주 유지해 잔여 호출을 탐지한다 |
| 금액 | 원 단위 정수. 수량은 8자리. 환율은 소수 4자리 |

## 6. 스트리밍 응답

코치 대화는 LLM 토큰을 흘려보낸다. 서버는 **BFF에 SSE로 중계**한다.

- `Content-Type: text/event-stream` · `Cache-Control: no-cache` · `X-Accel-Buffering: no`
- 클라이언트 연결이 끊기면 **LLM 호출을 취소**한다(`req.on('close')` → AbortController). 안 하면 유령 호출이 CPU와 비용을 먹는다
- 하트비트를 주기적으로 보낸다. 프록시가 유휴 연결을 끊는다
- 상세 계약은 `bff/.claude/rules/streaming-sse.md`

## 7. URL 규칙

컨텍스트 이름이 곧 리소스 경로다: `/api/ledger/*` · `/api/invoice/*` · `/api/tax/*` · `/api/plan/*` · `/api/coach/*`.

조합 컨텍스트도 자기 경로를 갖는다: `homebriefing` → `GET /api/home`.

기존 경로(`/api/investment` · `/api/portfolio` · `/api/ai-coach` · `/api/profit-plan` · `/api/signal-performance` · `/api/trade-preflight` · `/api/behavior-coach`)는 **이관 중 유지**하고, BFF 계약 변경과 함께 옮긴다. 프론트가 먼저, 서버가 나중이다.

## 8. Swagger

라우터에 JSDoc으로 선언한다. `swagger.md` 규칙을 따른다. **응답 예시에 실제 금액 데이터를 넣지 않는다.**
