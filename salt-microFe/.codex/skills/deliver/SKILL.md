---
name: deliver
description: "Phase 4: export, 문서, 변경 요약, 커밋 준비를 수행한다"
---

# Phase 4: Deliver

## 컨텍스트

!`git diff --stat -- salt-microFe/`
!`git status --porcelain -- salt-microFe/`

## 지시사항

### 1. Export 검증

- 도메인 `index.ts`가 public API만 export하는지 확인한다.
- `packages/ui` 변경 시 `package.json exports`가 필요한 subpath를 포함하는지 확인한다.
- 불필요한 barrel export를 만들지 않는다.

### 2. 문서 검증

- 구조/명령/MFE 계약 변경 시 `salt-microFe/AGENTS.md` 또는 관련 README를 업데이트한다.
- 새 rule이 필요하면 `.codex/rules`에 추가한다.

### 3. 변경 요약

```text
## Changes
- Added:
- Modified:
- Removed:
- Verification:
```

### 4. 커밋 준비

- 관련 파일만 선별한다.
- `.env`, credential, build output, `.next`는 제외한다.
- 커밋은 사용자 요청 없이는 직접 수행하지 않는다.

### 5. 커밋 메시지 제안

```text
feat: 간결한 설명

무엇을 왜 변경했는지 설명
```
