# FE-REQ-025 retrospects

## 2026-11-19 FR 대조 정리

- 9월 성능 정의는 홈 블록 · RSC 경계를 전제로 숫자를 정했는데 v2 화면이 클라이언트 잎으로 갔다. Action: 화면 구조를 바꾸는 슬라이스는 같은 기능의 PERF REQ 머리에 대체 표기를 그 PR 에서 단다
- CLS 가 넘칠 것으로 보고 스켈레톤부터 넣으려 했으나 재 보니 0.0006 이었다. Action: 성능 고치기 전에 운영 빌드로 먼저 잰다(`performance-frontend.md` §0)
