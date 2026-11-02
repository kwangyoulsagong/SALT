# 돈 관리 앱 F0 — zone = 도메인 — 회고

영역 회고: `salt-microFe/requirements/reports/retrospects/FE-REQ-052.md`(본체) · `FE-REQ-007.md` · `FE-REQ-008.md` · `FE-REQ-009.md` · `FE-REQ-035.md` · `FE-REQ-044.md`

## 요약

- **"레지스트리가 단일 소스"는 말뿐이었다** — 같은 zone 경로가 네 곳에 있었고 web-tax eslintrc 목록은 이미 낡아 있었다(`/search` · `/settings` 없음). JSON 하나 + TS/CommonJS 대조 테스트로 바꿨다
- **전환기 상태를 문서 표가 아니라 레지스트리 칸(`hostedIn`)으로 적었다** — 그래서 규칙을 미루지 않고 지금 강제할 수 있다. 다음 REQ 는 칸 값 하나를 바꾸면 lint · `CrossZoneLink` · rewrites 가 함께 따라온다
- 작업 중 사고 하나: 기록 스크립트가 f-string 안 dict 식을 평가하지 않아 영역 체크리스트 · 회고 10곳에 코드 문자열이 들어갔다 — 바로 발견해 고쳤다(삭제 0 확인)

## Action

- 화면 이전 REQ(`FE-REQ-053` · `056`)는 셸 라우트 삭제 + `hostedIn` 전환을 한 커밋에(두 스펙 Changelog 에 적음)
- 기록 스크립트는 문자열을 먼저 변수로 만들고 쓴 뒤 `tail` 로 한 번 본다
