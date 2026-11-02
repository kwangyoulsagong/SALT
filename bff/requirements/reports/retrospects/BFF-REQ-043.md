# BFF-REQ-043 회고 (1단계, 2026-11-02)

- 새 경로를 국내 `read()` 에 그대로 얹었다 — 503 `KR_STOCK_DISABLED` 만 `disabled` 로, 그 밖 503(`MARKET_SCHEDULE_UNAVAILABLE`)은 `unavailable` 로 이미 갈렸다. 상태 세 갈래를 처음에 한 곳에 둔 덕이다.

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 경로를 만든 다음 날 웹 소비처가 사라졌다. 지우지 않고 둔 이유(공개 일정 · 앱)를 Changelog 에 남겼다.
