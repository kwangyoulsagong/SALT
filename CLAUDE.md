# 레포지토리 하네스

PM/기능 기획 Claude 규칙은 `pm/CLAUDE.md`에 있다.
프론트엔드 Claude 규칙은 `salt-microFe/CLAUDE.md`에 있다.
BFF Claude 규칙은 `bff/CLAUDE.md`에 있다.
백엔드 Claude 규칙은 `salt-server/CLAUDE.md`에 있다.

PM 작업은 `pm/**`를 작업 범위로 보고, `pm/.claude/rules/`의 관련 규칙을 먼저 읽는다. 기능 기획서는 `salt-microFe/**`, `bff/**`, `salt-server/**` 전체 구현 현황과 계약을 근거로 계속 업데이트한다.

프론트엔드 작업은 `salt-microFe/**`를 작업 범위로 보고, `salt-microFe/.claude/rules/`의 관련 규칙을 먼저 읽는다. `bff/**`, `salt-server/**`는 사용자가 API 계약 변경을 명시하지 않으면 수정하지 않는다.

BFF 작업은 `bff/**`를 작업 범위로 보고, `bff/.claude/rules/`의 관련 규칙을 먼저 읽는다. 프론트엔드 응답 계약이나 백엔드 API 호출 계약 변경이 있으면 `salt-microFe/**`, `salt-server/**` 영향 여부를 함께 확인한다.

백엔드 작업은 사용자가 `salt-server/**` 변경을 명시한 경우에만 수행하고, `salt-server/.claude/rules/`의 관련 규칙을 먼저 읽는다. API 계약 변경이 있으면 `salt-microFe/**` 영향 여부를 함께 확인한다.

글로벌 요구사항/리포트는 루트 `requirements/**`에서 관리한다. 여러 영역을 한 번에 진행하는 작업은 `requirements/specs/in-progress/`의 글로벌 계획을 먼저 확인하고, 각 영역별 세부 요구사항은 `pm/requirements/**`, `salt-microFe/requirements/**`, `bff/requirements/**`, `salt-server/requirements/**`와 동기화한다.
