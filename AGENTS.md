# 레포지토리 하네스

PM/기능 기획 Codex 규칙은 `pm/AGENTS.md`에 있다.
프론트엔드 Codex 규칙은 `salt-microFe/AGENTS.md`에 있다.
BFF Codex 규칙은 `bff/AGENTS.md`에 있다.
백엔드 Codex 규칙은 `salt-server/AGENTS.md`에 있다.

PM 작업은 `pm/**`를 작업 범위로 보고, `pm/.codex/rules/`의 관련 규칙을 먼저 읽는다. 기능 기획서는 `salt-microFe/**`, `bff/**`, `salt-server/**` 전체 구현 현황과 계약을 근거로 계속 업데이트한다.

프론트엔드 작업은 `salt-microFe/**`를 작업 범위로 보고, `salt-microFe/.codex/rules/`의 관련 규칙을 먼저 읽는다. `bff/**`, `salt-server/**`는 사용자가 API 계약 변경을 명시하지 않으면 수정하지 않는다.

BFF 작업은 `bff/**`를 작업 범위로 보고, `bff/.codex/rules/`의 관련 규칙을 먼저 읽는다. 프론트엔드 응답 계약이나 백엔드 API 호출 계약 변경이 있으면 `salt-microFe/**`, `salt-server/**` 영향 여부를 함께 확인한다.

백엔드 작업은 사용자가 `salt-server/**` 변경을 명시한 경우에만 수행하고, `salt-server/.codex/rules/`의 관련 규칙을 먼저 읽는다. API 계약 변경이 있으면 `salt-microFe/**` 영향 여부를 함께 확인한다.
