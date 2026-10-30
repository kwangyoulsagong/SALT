# F004 슬라이스 20 — 주의할 점 종목별 칩 체크리스트

| 요구 | 구현 | 확인 |
|---|---|---|
| 종목별 칩 (`FE-REQ-026` FR-166) | `ReportRiskList` · `messages.ts` 2문구 (`13900cd8`) | 3100 dev · route 고정 리포트(BTC 2 · ETH 1 · 종목 없음 1) 1440: 칩 "전체 · 비트코인 · 이더리움"(아이콘) · 전체 4줄 → 비트코인 2줄 → 전체 4줄 · 칩 `aria-pressed` 전체만 true |
| 종목 하나면 칩 없음 | `canFilter` | route 고정 리포트(BTC 2): 칩 묶음 0 · 2줄 |
| 정렬 유지 | `severity` 내림차순 그대로 | 전체 순서 ETH(4) · BTC(3) · 거래(2) · BTC(1), 거른 뒤 BTC(3) · BTC(1) |
| 공통 수용 기준 | — | 주문 경로 0 · 금액 계산 없음 · 새 문구 "전체" · "주의할 점 종목별로 보기"(확신 · 명령형 0) |

## REQ 상태

- **done 이동 없음.** `FE-REQ-026` 은 FR-70~72 피드백 화면 등이 남았다. 루트 슬라이스 문서만 `done/`
- `FEATURE-004` FR-3 → 완료(웹), 수용 기준 한 줄 체크

## 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm check-types` · `lint` | 5/5 · 5/5(`--max-warnings 0`) |
| `turbo test --force` | core 51 · ui 43 통과 |
| `pnpm test:layer-check` | 차단 8 · 통과 5 |
| `pnpm build`(web · web-tax) · `--filter web-tax build` | 통과 · `/coach/report` 1.66 kB · 첫 로드 130 kB |
| 훅 사후 실행(셸로 쓴 파일) | `ReportRiskList.tsx` · `messages.ts` exit 0 |
| Playwright(route) | 위 표 — dev 서버는 확인 뒤 내리고 빌드 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 실계정 리포트 | 소유자 로그인 필요 — 실제 리스크가 여러 종목에 걸리는지 | `QA-001` |
| RN 칩 | 앱 미착수 | `RN-REQ-020` |
