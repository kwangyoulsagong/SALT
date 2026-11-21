# F019 순서 3 회고 — 휴대폰 오프라인 마지막 화면 · 설치 안내

영역 회고: `salt-microFe/requirements/reports/retrospects/FE-REQ-073.md`.

- 서비스 워커가 있는 화면의 오프라인 시험은 Playwright `setOffline` 만으로는 가짜다(워커 요청이 나간다) — 첫 회차 13 실패가 그 때문이었다. 플래그를 규칙(`mobile-design.md` §5)에 적었다
- 번들 기준을 옛 체크리스트 수치로 잡지 않고 main 을 같은 방식으로 빌드해 대조했다 — 그래서 설치 카드의 +30 을 잡았다
- 할 일: ~~휴대폰 배터리 점검~~ 같은 PR 순서 3b(`F019-s3b-mobile-battery-slice.md`)
