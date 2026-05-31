---
name: pipeline
description: "SALT BFF plan → orchestrate → validate → deliver → retrospect 순서로 작업을 진행한다"
argument-hint: <요구사항 파일명 또는 자유 텍스트>
---

# SALT BFF 파이프라인

아래 순서로 진행한다.

1. `plan`: 요구사항을 REST/WS/worker/backend 연동 영향 중심으로 분해한다.
2. `orchestrate`: 관련 rule을 읽고 구현한다.
3. `validate`: `npm run build`와 REST/WS/worker 정적 점검을 수행한다.
4. `deliver`: 변경 요약, 검증 결과, 잔여 리스크를 정리한다.
5. `retrospect`: 기술부채와 규칙 보완점을 남긴다.

각 단계에서 `bff/CLAUDE.md`와 `.claude/rules/**`를 우선 적용한다.
