# 추적성 규칙

## 목적

기능 기획서에서 제품 요구사항과 구현 위치를 연결한다. 기능 변경 시 어느 레이어를 봐야 하는지 바로 알 수 있어야 한다.

## Trace Matrix

기능 기획서마다 아래 표를 둔다.

```md
| 요구사항 | 화면/컴포넌트 | BFF/API | 서버/API | DB/Worker | 검증 |
|---|---|---|---|---|---|
```

## 링크 작성

- 로컬 파일 경로는 repo 기준 상대 경로로 쓴다.
- endpoint는 method와 path를 함께 쓴다.
- DB는 Prisma model 이름을 쓴다.
- worker는 class/file과 실행 주기를 쓴다.

## Gap 표기

레이어 사이 연결이 끊겨 있으면 `Gap`으로 기록한다.

예:

```md
| 목표 저축 생성 | goals add screen 있음 | `/api/goals` proxy 있음 | `POST /api/goals` 있음 | `Goal` | Gap: 프론트 submit이 실제 API 호출까지 연결됐는지 확인 필요 |
```

## 검증

- 화면이 있으면 route 접근 또는 Storybook/컴포넌트 검증을 적는다.
- API가 있으면 요청/응답 예시 또는 build-time 타입 근거를 적는다.
- worker가 있으면 수동 실행, 로그, 실패 처리 확인 방법을 적는다.
