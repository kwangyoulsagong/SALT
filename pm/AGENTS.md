# SALT PM Codex 하네스

`pm/**` 기능 기획서와 제품 문서 작업에 적용한다. PM 문서는 `salt-microFe/**`, `bff/**`, `salt-server/**`의 실제 구현과 API 계약을 근거로 유지한다.

## 목적

- 현재 구현된 기능을 제품 관점에서 파악한다.
- 새 기능을 만들 때 화면, API, 데이터, 정책, 검증 기준을 먼저 정리한다.
- 구현이 바뀌면 기능 기획서도 함께 업데이트한다.
- 프론트엔드, BFF, 서버 사이 계약이 문서에서 추적되게 한다.

## 디렉터리

```text
pm/
  AGENTS.md
  features/
    current-feature-map.md
    FEATURE-{번호}-{slug}.md
  templates/
    feature-spec-template.md
    investment-feature-report-template.md
  prototype/
    index.html
    src/
  reports/
    feature-audits/
```

## 작업 원칙

- 기능 기획 작업 전 `pm/.codex/rules/feature-planning.md`를 읽는다.
- 기능 파악은 코드 추측이 아니라 실제 파일, route, API 상수, Prisma model, BFF aggregation을 근거로 한다.
- 새 기능 또는 기능 변경은 `pm/features/FEATURE-{번호}-{slug}.md`에 작성한다.
- 기존 기능이 바뀌면 `pm/features/current-feature-map.md`와 해당 기능 기획서를 업데이트한다.
- API 계약 변경이면 `bff/**`, `salt-server/**`, `salt-microFe/**` 영향 여부를 같이 표시한다.
- 기획서에는 UX 흐름, 권한, 상태, 에러, 로딩, 빈 상태, 수용 기준을 포함한다.
- PM 프로토타입은 `pm/prototype/**`에 작성하고, 실제 백엔드 response shape와 WebSocket message type을 더미 데이터로 맞춘다.

## 규칙 인덱스

- `.codex/rules/feature-planning.md` — 기능 기획서 작성/업데이트 규칙
- `.codex/rules/feature-inventory.md` — 전체 기능 파악과 기능 맵 유지 규칙
- `.codex/rules/traceability.md` — 화면/API/DB/worker 추적 규칙
- `.codex/rules/prototype-design.md` — PM React 프로토타입/더미 계약/디자인 규칙

## 산출물

- `features/current-feature-map.md`: 현재 제품 기능 인벤토리
- `features/FEATURE-{번호}-{slug}.md`: 기능별 기획서
- `prototype/`: 더미 백엔드 계약 기반 React 프로토타입
- `reports/feature-audits/{YYYY-MM-DD}.md`: 전체 기능 파악/변경 감사 리포트

PM 문서는 구현의 대체물이 아니다. 구현 가능한 수준으로 결정을 좁히되, 실제 코드와 어긋나는 부분은 `Open Questions` 또는 `Gap`으로 표시한다.
