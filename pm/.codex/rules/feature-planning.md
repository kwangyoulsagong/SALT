# 기능 기획서 작성 규칙

## 목적

기능 기획서는 "무엇을 만들지"뿐 아니라 "왜 필요한지", "어떤 화면/API/데이터가 연결되는지", "완료 기준이 무엇인지"를 정리하는 문서다.

## 파일명

```text
pm/requirements/specs/in-progress/FEATURE-{번호}-{slug}.md
```

예:

```text
pm/requirements/specs/in-progress/FEATURE-001-goal-saving.md
```

## 필수 섹션

```md
# FEATURE-{번호}: {기능명}

## TL;DR

## 배경과 문제

## 목표

## 사용자 시나리오

## 기능 요구사항

## 비기능 요구사항

## UX 상태

## 정책과 제약

## 화면/프론트엔드 영향

## BFF/API 영향

## 서버/DB/Worker 영향

## 이벤트/상태 흐름

## 수용 기준

## 검증 계획

## Open Questions

## 변경 이력
```

## 작성 기준

- 기능 요구사항은 사용자의 행동 단위로 쓴다.
- 비기능 요구사항에는 성능, 접근성, 보안, 장애/재시도, 모바일/반응형, 관측성을 포함한다.
- UX 상태에는 loading, empty, error, unauthorized, success, optimistic update 여부를 적는다.
- API 영향은 method/path/request/response/status/auth를 표로 쓴다.
- DB 영향은 Prisma model, 주요 필드, index, migration 필요 여부를 쓴다.
- worker/event 영향은 실행 주기, trigger, 중복 실행, 실패 처리 기준을 쓴다.
- 모호한 결정은 숨기지 말고 `Open Questions`에 남긴다.

## 변경 시 업데이트

아래 변경이 있으면 기획서도 업데이트한다.

- 새 화면, route, remote app 추가
- API path/request/response/status/auth 변경
- Prisma schema/model/relation/status enum 변경
- WebSocket message type/payload 변경
- worker의 실행 주기, 생성 데이터, 알림 정책 변경
- 권한, 보안, 개인정보, 로그 정책 변경
- 주요 UX 상태나 에러 메시지 변경

## 금지

- 구현되지 않은 기능을 구현 완료처럼 쓰지 않는다.
- API가 없는 기능을 API 확정처럼 쓰지 않는다.
- 프론트 화면만 보고 서버 기능까지 있다고 단정하지 않는다.
- 서버 route만 보고 프론트 노출 기능이라고 단정하지 않는다.
