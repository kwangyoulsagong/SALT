# FE-REQ-033 retrospects

## 2026-11-19 — FR 대조 · done (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 9월 성능 FR 의 절반이 토큰 스트리밍 · 홈 3블록을 전제로 했다 — 전제가 바뀐 뒤에도 문서가 남아 `memo` 를 "하라"고 읽혔다. 실제로 넣고 재 보니 이득 0 → 뺐다. Action: 성능 FR 은 측정 전제(토큰/문장 · 블록 수)를 FR 줄에 함께 적는다
- 로그아웃 상태로 잰 번들(230.9 → 231 kB)은 위젯을 안 불러 차이가 안 보였다. Action: 로그인해야 그려지는 위젯은 실로그인으로 잰다
