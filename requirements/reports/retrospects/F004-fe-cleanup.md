# F004 슬라이스 8 — 프론트 부채 정리 — 회고

영역 회고: `salt-microFe/requirements/reports/retrospects/FE-REQ-035.md`

## 요약

- **세 번 적은 Action 을 네 번째에 닫았다.** 회고가 "lint 로 올린다"를 반복한 이유는 사용처가 남아 있어 금지를
  걸 수 없었기 때문이다. 부채 정리는 "사용처 0 → 금지 → 의존성 제거" 한 묶음으로 해야 다시 안 열린다
- **First Load 만 보면 이득이 안 보였다.** axios 는 지연 청크에 있었다 — 번들 측정에 청크 합계를 같이 본다
- 테스트가 회귀를 잡는지 뮤테이션으로 확인했다(KST 고정 제거 → 4 실패)

## Action

- `performance-frontend.md` 번들 게이트에 "클라이언트 정적 JS 합계" 후보 — 다음 프론트 REQ 에서
- `*ApiError` 넷째가 생기면 `shared/api` 로 올린다
