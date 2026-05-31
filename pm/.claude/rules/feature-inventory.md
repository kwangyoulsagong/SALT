# 전체 기능 파악 규칙

## 목적

`current-feature-map.md`는 현재 SALT 제품이 가진 기능을 한눈에 보기 위한 인벤토리다. 프론트, BFF, 서버 중 어디까지 구현되어 있는지 분리해서 기록한다.

## 파악 순서

1. 프론트 화면: `salt-microFe/apps/**/src/pages`, `src/component`, `src/api`, `src/hooks`
2. BFF 계약: `bff/src/rest/routes`, `bff/src/rest/controllers`, `bff/src/services`, `bff/src/websocket`
3. 서버 계약: `salt-server/src/app.ts`, `src/modules/**/**.routes.ts`, `src/modules/**/**.service.ts`
4. 데이터 모델: `salt-server/prisma/schema.prisma`
5. 워커/외부 연동: `salt-server/src/workers`, `bff/src/workers`, `src/external`

## 상태 표기

- `Implemented`: 화면/API/데이터 흐름이 코드에 존재한다.
- `Partial`: 일부 레이어만 존재하거나 흐름이 끊겨 있다.
- `Backend Only`: 서버 기능은 있으나 프론트 노출이 확인되지 않는다.
- `Frontend Only`: 화면 또는 mock은 있으나 API/서버 계약이 확인되지 않는다.
- `Planned`: 기획 문서에는 있으나 구현 근거가 없다.
- `Unknown`: 코드 근거가 부족해 확인이 필요하다.

## 기능 맵 업데이트 기준

- 기능 추가/삭제/이름 변경
- 상태 변경: Partial → Implemented, Backend Only → 노출 완료 등
- API 또는 DB 모델 추가/삭제
- 화면 route 추가/삭제
- 주요 worker 추가/삭제

## 기능 맵 필수 컬럼

```md
| 기능 | 상태 | 프론트 | BFF | 서버 | 데이터/Worker | 메모 |
|---|---|---|---|---|---|---|
```
