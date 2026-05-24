---
name: orchestrate
description: "Phase 2: 수립된 계획에 따라 SALT MicroFE 코드를 작성한다"
---

# Phase 2: Orchestrate

## 컨텍스트

!`cat salt-microFe/AGENTS.md`
!`find salt-microFe/apps salt-microFe/packages -maxdepth 3 -type f \( -name '*.ts' -o -name '*.tsx' \) | sort`

## 지시사항

대화 컨텍스트의 Phase 1 계획을 기준으로 구현한다. `$ARGUMENTS`

## 실행 규칙

- 변경 전 대상 app/package의 `package.json`, `next.config.js`, `tsconfig.json`, 주변 코드를 확인한다.
- 도메인 폴더가 필요하면 `src/domains/{domain}/{components,api,hooks,store,types,constants}` 중 필요한 것만 만든다.
- route 파일은 thin composition으로 유지한다.
- `@/*`, `@repo/*` alias를 사용한다.
- app 간 직접 import를 만들지 않는다.
- browser-only 코드는 SSR guard 또는 작은 dynamic island로 격리한다.
- API는 service 함수 + query/mutation hook + query key factory로 작성한다.
- 상태는 서버 상태와 클라이언트 상태를 분리한다.
- shared UI 변경은 app 의존성을 넣지 않는다.

## 완료 보고 형식

```text
완료:
- [scope] 작업 — 생성/수정 파일

검증 필요:
- 명령 또는 수동 확인 항목
```
