# SRV-REQ-006 회고 — DDD 전환 1단계

작성: 2026-09-11
체크리스트: `requirements/reports/checklists/SRV-REQ-006.md`

## 1. 왜 1단계에서 멈췄는가

REQ 는 이관 순서를 이렇게 적었다: `shared` → 신규 컨텍스트 → **`coach`** → 나머지.

`shared` 는 계획대로 섰다. 그런데 **FR-32(`coach` 를 먼저 옮긴다)가 성립하지 않는다.**

```
ai-coach/*  →  ai-investment-coach.service  →  market-regime.service    (→ market)
                                            →  portfolio-state.service  (→ portfolio)
                                            →  news-analysis.service    (→ news)
                                            →  behavior-analysis.service (→ coach)
```

컨텍스트 경계 규칙은 "다른 컨텍스트는 `application/api` 로만 부른다"이다. 그러면 `coach` 를
옮기는 순간 **`market`·`portfolio`·`news` 의 공개 API 가 먼저 있어야 한다.** 셋 다 없다.

선택지는 셋이었다:

| 안 | 문제 |
|---|---|
| `coach` 만 옮기고 나머지는 `modules` 를 직접 부른다 | 경계가 첫날부터 뚫린다. 이 REQ 의 목적이 정확히 그것을 막는 것이다 |
| 네 컨텍스트를 한 번에 옮긴다 | ~3,600줄. 안전망(§2) 없이 한 커밋에 넣을 크기가 아니다 |
| **1단계에서 끊고 범위를 다시 잡는다** | 선택 |

**절반 옮긴 컨텍스트를 남기는 것이 가장 나쁘다.** 두 아키텍처가 공존하는 동안 다음 사람이
어느 쪽 규칙을 따라야 하는지 판단할 수 없게 된다.

## 2. 안전망이 없다는 것을 먼저 알았어야 했다

NFR 은 "이관 전/후 응답이 **바이트 단위로 같아야 한다**"를 요구하고 스냅샷 테스트를 수용 기준으로
걸었다. 코드를 읽기 시작한 뒤에야 **DB 가 비어 있다**(거래 0행)는 것을 확인했다.

스냅샷을 찍어도 전부 `insufficient_data` 다 — 이관을 아무것도 검증하지 않는다.

→ **다음 단계의 첫 작업은 이관이 아니라 안전망이다.** 위험한 것은 DB 접근이 아니라 계산이다:
`profit-plan` 의 손절·익절 가격, `trade-preflight` 의 손익비·비중, `ai-coach-score.engine` 의
468줄 점수 계산. 이들은 **입력만 주면 되는 순수 계산**이라 DB 없이 특성화 테스트를 쓸 수 있다.

그걸 먼저 쓰고 나서 옮긴다.

## 3. 예상과 달랐던 것

### 3-1. `main` 의 빌드가 이미 깨져 있었다

`npm run build` 가 **에러 17건**으로 실패한다. 이관 때문인 줄 알고 `main` 에서 확인했더니 같았다.

`npm start` 가 `dist/` 를 돌기 때문에 **빌드가 깨진 채로 배포 산출물만 살아 있었다.** 전부
Prisma 스키마와 코드의 어긋남이다(`userId_symbol` 복합 키 없음, `assetType` 필수 누락,
`InsightType` 불일치, `Decimal` ↔ `number`).

이관이 만든 새 에러는 0건이고, 게이트를 "17건보다 늘지 않는다"로 두고 규칙에 적었다.
**검증 명령이 이미 실패하고 있으면 그 명령은 게이트가 아니다** — 그 사실을 규칙에 적는 것까지가 일이다.

### 3-2. `dist/` 가 추적 대상도 무시 대상도 아니었다

`main` 빌드를 확인하려고 stash 했다가, 그 빌드가 만든 `dist/` 가 stash 복원과 충돌해 작업을
잃을 뻔했다. `.gitignore` 에 넣었다.

**빌드 산출물이 `.gitignore` 에 없다는 것 자체가 신호였다** — 아무도 이 레포에서 빌드를
돌리지 않았다는 뜻이다. §3-1 과 같은 사실을 다른 각도에서 가리키고 있었다.

### 3-3. 규칙 표를 두 벌 만들 뻔했다

FR-12 는 "같은 검사를 ESLint(`no-restricted-imports` 패턴)에도 넣는다"고 적었다. glob 으로
방향 규칙을 표현하면 **판정이 두 곳에 생긴다.** 프론트(`FE-REQ-009`)에서 같은 문제를 겪었고,
거기서 쓴 방법 — **`checkImport` 를 그대로 부르는 커스텀 규칙** — 을 그대로 가져왔다.

레포 CLAUDE.md 의 "하네스를 다시 늘리려면 미러가 아니라 같은 파일을 가리키게 한다"가
여기에도 적용된다.

## 4. 이번에 굳힌 판단

- **`authMiddleware` 는 `shared/presentation`에 둔다.** 모든 컨텍스트의 라우터가 걸기 때문이다.
  `auth/presentation` 에 두면 다른 컨텍스트의 `presentation` 이 남의 컨텍스트를 부르게 된다.
  여기 있는 것은 **토큰 전송 계층**이고, 초대 코드·세션 수명 같은 `auth` 도메인 규칙이
  들어오기 시작하면 그때 조합 지점으로 옮긴다. 파일에 그 조건을 적어 뒀다.
- **`AppError` 계열을 지우지 않고 `shared/presentation/httpErrors.ts` 로 옮겼다.** 새 코드는
  `DomainError` 를 쓰고, 이 파일은 이관이 끝나면 사라진다. 에러 미들웨어가 둘 다 처리한다.
- **빈 컨텍스트 디렉터리를 만들지 않았다.** FR-31 은 `ledger`·`tax` 등을 "새로 쓴다"고 했지만
  그 기능 자체가 아직 없다. 레지스트리 철학은 "표에 있다고 폴더가 있는 것은 아니다"이다.

## 5. 다음 사람이 할 일 — 순서

1. **특성화 테스트부터.** `profit-plan` 3단계 가격 · `trade-preflight` 손익비/비중 ·
   `ai-coach-score.engine` 점수. DB 없이 순수 함수로 잰다
2. **`market`·`portfolio`·`news` 의 `application/api` 를 먼저 만든다.** `coach` 가 그걸 부른다
3. 그 다음 `coach` 통합 (`ai-coach` + `signal-performance` + `profit-plan` + `behavior-coach` +
   `trade-preflight` + `behavior-analysis`)
4. `market`·`portfolio` 이관 시 **빌드 에러 17건을 함께 고친다**
5. `mission`·`feed`·`dashboard` 는 옮기지 않는다 (FR-34)

## 6. REQ 본문에 반영이 필요한 것

| 항목 | 내용 |
|---|---|
| FR-32 | "coach 를 먼저 옮긴다"는 실제로 **coach + market + portfolio + news 동시 이관**이다. 의존을 본문에 적어야 한다 |
| FR-31 | 기능이 없는 컨텍스트를 "새로 쓴다"고 적을 수 없다. 각 기능 REQ 로 넘긴다 |
| NFR 스냅샷 | DB 가 비어 있는 조건에서 성립하지 않는다. 대체 수단(특성화 테스트)을 명시해야 한다 |
| FR-12 | `no-restricted-imports` 로 지정하면 규칙 표가 두 벌이 된다 |
