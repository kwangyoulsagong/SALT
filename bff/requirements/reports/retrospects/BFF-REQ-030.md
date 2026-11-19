# BFF-REQ-030 retrospects

## 2026-11-19 — FR 대조 · done (루트 `requirements/specs/done/WEB-perf-req-close-slice.md`)

- 스트림 성능 FR(backpressure · 커넥션 60초)은 LLM 토큰 흐름을 전제로 했다. 규칙 답은 밀리초에 끝나 전제가 사라졌다. Action: LLM 대화를 켜는 결정이 나면 FR-1 · 40~42 를 그때 다시 잰다(`SRV-REQ-028` LLM FR 과 같이)
