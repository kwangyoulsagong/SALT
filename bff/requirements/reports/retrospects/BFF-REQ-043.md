# BFF-REQ-043 회고 (1단계, 2026-11-02)

- 새 경로를 국내 `read()` 에 그대로 얹었다 — 503 `KR_STOCK_DISABLED` 만 `disabled` 로, 그 밖 503(`MARKET_SCHEDULE_UNAVAILABLE`)은 `unavailable` 로 이미 갈렸다. 상태 세 갈래를 처음에 한 곳에 둔 덕이다.

## 국내 탭 요약 띠 (F011, 2026-11-02)

- 경로를 만든 다음 날 웹 소비처가 사라졌다. 지우지 않고 둔 이유(공개 일정 · 앱)를 Changelog 에 남겼다.

## 2026-11-10 — F018

- F018 이 이 REQ 의 파일을 걸쳤다(위 체크리스트 2026-11-10 절). 국내 소유자 전용(F011 §정책)을 전제로 쓴 주석 · 단언이 여러 곳에 흩어져 있었다 — 전제가 바뀌면 그 문장을 grep 으로 한 번에 찾는다


## 2026-11-17 — F008 슬라이스 24 2단계(`feat/f008-slice24-s2-earnings-window`, 루트 `requirements/specs/in-progress/F008-slice24-kr-market-events-slice.md`)

- **잘 된 것** — 실제 원문 · 전 종목을 눈으로 살펴 첫 판 결함 여섯을 done 전에 잡았다(디코딩 · 월간 공시 · 건수 규칙 · IR 내용 칸 · 스키마 CHECK 둘).
- **아쉬운 것** — 스키마 불변식(`scheduled_event` `announced_at <= event_at`)을 설계 전에 읽지 않아 실행에서야 걸렸다. 선언을 믿는 디코더가 3일 동안 한글을 깨뜨렸는데 숫자 대조가 통과해 아무도 몰랐다.
- **다음에** — 새 원천은 저장된 본문을 한 건 눈으로 본다(글자가 사람이 읽을 수 있나) · 표에 행을 쓰는 설계는 그 표의 CHECK · FK 부터 읽는다. 기계 검사는 `dartDecode.test.ts`(실제 원문 픽스처)로 둔다(done 체크리스트 §1).
