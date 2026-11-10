# 리서치 — AI 코치 "잘 사고 잘 팔기": 늘 보이는 해설 · 단타 예측의 한계 · 사람들이 필요한 것 · 패널 디자인 · 모션

- 날짜: 2026-11-10
- 요청: 사용자 *"베스트 케이스로 딥리서치 웹리서치"* · *"더 리서치를 하고"* · *"진짜 사람들이 투자할 때 필요한 게 뭔지"* · *"디자인 레퍼런스"* · *"전체 딥리서치"*
- 결과물: `FEATURE-017` 개정 · `SRV-REQ-053` · `BFF-REQ-052` · `FE-REQ-064` · `FC-REQ-028` · `DB-REQ-043` · `ADR-010` 채택 · `ADR-009` 개정 · 정리 화면 `pm/docs/2026-11-10-ai-coach-scenario.html`
- 묶음: 조사 다섯(해설 사전 생성 · 결측 UX · 지연 / 단타 신호 · 온톨로지 / 투자자 니즈 / 패널 디자인 레퍼런스 / 모션). 11-09 리서치(`2026-11-09-ai-coach-best-case.md` — 숫자 환각 · 보류 · 설명 과의존 · LLM 에이전트 채점)와 겹치는 내용은 빼고 링크만
- 근거 등급: [원문] 원문 확인 · [초록] 초록 · 요약만 · [기사] 기사 · 블로그. 참고한 외부 서비스 이름은 쓰지 않는다

## 0. 요약

1. **해설은 요청 때 만들지 않는다.** 주기 배치 + 바뀐 종목만(지문 캐시) + 실패하면 이전 성공본 유지 + 4단 대체(최신 → 이전 + 시각 → 사실표 문장 → "특이 소식 없음")면 칸이 비지 않는다. 대형 증권 앱도 모든 종목에 늘 해설을 붙이지는 않지만, 우리는 추적 종목이 적어 전 종목이 된다
2. **화면은 외부 호출을 기다리지 않는다.** 칸마다 값 · 기준 시각 · 상태 · 이유를 한 덩어리로. 받아 둔 값이 있으면 그것 + 시각(stale-if-error), 집계 응답은 예산 + 부분 응답, 재시도는 한 층에서만 — 오늘 고친 결함 여섯의 공통 원인이 이것이었다
3. **데이터가 많아도 단타 예측은 어렵다.** 시도할 규칙이 늘수록 우연히 좋아 보이는 규칙도 는다. 국내 외국인 순매수는 표본 안 t=54.7 이었는데 표본 밖 Sharpe −1.65(비용 20bp 면 −2.96). 발표된 예측 요인은 발표 뒤 효과가 58% 줄었다. 그래서 사전등록 · 기간 나눔 · 비용 차감 · 다중검정 보정 · 보정도가 먼저다
4. **개인 투자자가 잃는 이유는 행동이다.** 국내 계좌 20만 명 — 자주 사고팔수록 · 일중 비중이 클수록 성과가 낮았고(비용 뺀 신규 투자자 초과수익률 −17.6%), 이익 종목을 팔 확률이 손실 종목의 2.18배, 검색이 몰린 종목을 산 뒤엔 되돌림
5. **효과가 확인된 개입은 결정하는 자리의 모습을 바꾼 것이다.** 매입가 가리기 → 처분효과 −25%, 가격을 덜 본 트레이더 이익 +53%. 정보만 주는 개입은 3개월이면 사라졌다 → 별 메뉴가 아니라 종목을 보는 그 자리에
6. **그림은 기준 집합과 함께.** 확률은 "100번 중 61번"과 반대쪽 확률을 같이, 범위는 바깥선 없는 투명 팬(외곽선은 "경계"로 읽힌다), 기저율은 점 20개(분모 고정), 성적은 기준선 · 표본과 함께 — 별점 · 등급 금지
7. **모션은 짧고 의미 있게.** 자주 보는 것일수록 짧게(100~400ms) · 바뀐 자리만 · `transform`/`opacity` 만 · 모션 줄이기면 즉시. 가격은 깜빡이지 않고 바뀐 자리만 굴림

## 1. 해설을 늘 보이게 — 사전 생성 · 대체 사다리

| 사실 | 등급 | 옮긴 것 |
|---|---|---|
| 대형 증권 · 코인 앱은 해설 대상을 조회수 · 변동 크기 · 새 소식으로 거르고, 없으면 "제공 안 됨" | [기사] | 우리는 추적 종목 전부 — 대신 4단 대체로 빈 칸 0 (`SRV-REQ-053` FR-3) |
| 생성은 주기 배치 + 속보 트리거, 화면에 생성 시각 · AI 표시 · 출처 · 면책 고정 | [원문] | 스냅샷 배치 · `generatedAt` · 출처 번호 칩 |
| 캐시 키 = 사실표 · 판정 · 프롬프트 · 모델 · 검증기 버전 해시, 실패 생성은 캐시에 쓰지 않음 | [기사] | 종목 지문 (`DB-REQ-043` FR-1) |
| RFC 5861 stale-if-error — 재검증 실패여도 마지막 성공 값을 기준 시각과 | [원문] | 판단 상세 504 → 마지막 판단 + `staleSince` (`BFF-REQ-052` FR-0) |

## 2. 지연 — 화면이 기다리지 않게

| 사실 | 등급 | 옮긴 것 |
|---|---|---|
| 집계 응답은 가장 느린 하위 호출을 기다린다 — 예산을 정하고 남은 시간을 넘기고, 넘긴 칸은 마지막 값 · "없음"으로 200 부분 응답 | [원문] SRE · tail at scale | 호가 2초 상한 + `pending` · 대시보드 15초 캐시 |
| 재시도를 층마다 하면 곱해진다(3층 × 4회 = 64) | [원문] | 재시도는 BFF 한 층 · 1회 |
| 백분위는 평균하지 말고 히스토그램을 합쳐 p95 · p99 | [원문] | 측정표 |

## 3. 단타 예측 — 무엇이 살아남나

| 사실 | 등급 | 옮긴 것 |
|---|---|---|
| 새 요인은 t>3 · 변형 45회 넘게 시도하면 Sharpe 1.0 도 우연(Deflated Sharpe) · 발표 뒤 효과 −58% | [초록] | 사전등록 · 시도 수 기록 · 다중검정 보정 (`FC-REQ-028` FR-1) |
| 국내 외국인 순매수: 표본 안 t=54.7 · 표본 밖 Sharpe −1.65(비용 20bp −2.96) · 국면별 계수 3.5배 차이 | [원문 · 미심사] | 수급은 후보일 뿐 · 국면별 채점 |
| 코인 최우선 호가 불균형 · 펀딩 단독(8시간 R² 0.003) · 김치 프리미엄 수준은 비용 · 표본 밖에서 약함. 시가 구간 체결 쏠림(4~12시간) · 일중 모멘텀 · 지표 발표 1시간 반응은 비교적 나음 | [초록] | 후보 신호 우선순위 |
| 국내 장 초반 호가 불균형 → 그날 종가까지 · 업종 대형주 → 소형주 선행. 기관 흐름은 예측력 없음 | [초록] | 국내 후보 |
| CPI 서프라이즈가 BTC 첫 1시간 수익의 약 25% 설명 · FOMC 반응은 4시간 안 되돌림 · 코인 상장 당일 +5.7% 뒤 양의 효과 없음 | [초록] | 이벤트는 방향 판정보다 변동 · 되돌림 가설로 사전등록 |
| 관계 그래프 일 단위 정확도 55.1%(기준 +2pt, 비용 전) · 월 단위 공급망 모멘텀 월 1.55% | [원문 · 초록] | 온톨로지는 신호를 만들지 않는다 — 사실을 꺼내 해설 근거 · 후보 고르기에. F017 은 최소 연결만(`FC-REQ-022` 는 뒤) |
| LLM 이 무엇이 주가를 움직일지 고르면 전문가 일치 52% · 오탐 1~32% | [초록] | 태그는 규칙 사전 + 측정값 (`ADR-009` 개정) |

**우리 목표로 옮긴 문장**: 늘 맞히는 것이 아니라 확신이 있을 때만 말하고 그때 잘 맞히기 — "61%"면 실제로 61%(보정도), 기준(늘 오른다)보다 꾸준히 낫기. 못 넘으면 "방향이 안 보여요".

## 4. 사람들이 필요한 것 — 손실은 행동에서

| 사실 | 등급 | 옮긴 것 |
|---|---|---|
| 개인 손실이 거의 전부 즉시 체결 주문에서 · 꾸준히 이익 내는 일중 매매자 1% 미만(해외 계좌 연구) | [원문] | 사기 전 점검 — 추격 직전에 기저율 |
| 국내 20만 계좌: 회전 · 일중 비중 · 종목 교체가 클수록 성과 ↓ · 비용 뺀 신규 −17.6% · 처분효과 2.18배 · 검색 몰림 종목 매수 뒤 되돌림 | [원문] | 사기 전 · 팔기 전 점검 (`FEATURE-017` FR-3) |
| 매입가 가리기 → 처분효과 −25% · 가격을 드물게 본 쪽 이익 +53% · 손절을 적어 두고 알림만은 효과 없음, 미리 자동 매도만 효과 | [원문 · 초록] | 매입가 가리기는 이미 있음 · 우리는 주문하지 않으므로 계획을 지켰는지 측정만 |
| 정보 개입은 몇 주 뒤 약해져 3개월이면 소멸 · 무료 자문 수용 약 5% | [초록] | 별 메뉴 대신 그 자리에 |
| 평균회귀 구간에서는 손실 종목을 들고 있는 편이 나았다 | [초록] | 손절 권유 0 · 조건별 데이터만 |

## 5. 패널 그림 — 레퍼런스에서 가져온 형태

| 요소 | 형태 | 근거 |
|---|---|---|
| 확률 | 큰 % + 2분할 막대 + "100번 중 n번" | 강수확률 오해 연구 — 기준 집합 · 반대쪽 확률을 같이 적으면 오해가 준다 [원문] |
| 범위 | 투명 3단 팬(50 · 80 · 90%), 비대칭, 바깥선 없음 | 중앙은행 팬차트 [원문] · 허리케인 콘 오독 연구 [원문] |
| 기저율 | 점 20개 분위 도트 — 대안 10×10 | 분위 도트 판단 정확도 [원문] · 분모 1,000 이면 위험을 크게 느낌 [원문] |
| 성적 | 우리 vs 기준 막대 + 표본 | 기준선 없는 적중률은 과장 [기사] |
| 해설 | 문장 끝 번호 칩 · 출처에 날짜 | 오래된 출처 지적 [기사] |
| 대기 | 1초 미만은 아무것도 · 레이아웃 흔들림 막는 자리만 스켈레톤 | 스켈레톤 체감 효과 엇갈림 [원문] |

기준 앱 실측(2026-11-10, 1440 · 계산 스타일): 패널 `#FBFCFD` 모서리 16 안쪽 1px `rgba(2,32,71,.05)` · 상승 `#DE2B39` · 하락 `#2272EB` · 13/600 줄 20 ·
세그먼트 32/8 판 + 28/6 알약 · 패널 이름 칩 13/600 모서리 7 · 막대 6 · 전환 배경 0.2초 · 글자 0.1초 (`FE-REQ-064` FR-6).

## 6. 모션

| 사실 | 등급 | 옮긴 것 |
|---|---|---|
| 자주 보는 모션일수록 짧게, 대부분 100~400ms, 500 넘으면 늘어짐 | [원문] | 세그먼트 · 펼침 200~250 · 첫 등장 300~400 |
| 등장 이징 `cubic-bezier(.05,.7,.1,1)` · 기본 `(.2,0,0,1)` | [원문] 디자인 시스템 토큰 | `@repo/tokens` `motion.easing` 과 대조 |
| 자동 갱신 움직임은 WCAG 2.2.2 범위 · 모션 줄이기 존중 · 스크린리더엔 묶은 요약만 | [원문] | 숫자 굴림은 바뀐 자리만 · 라이브 영역 묶음 |
| View Transitions 이름이 겹치면 전환 전체가 건너뜀 · 히어로 1~2개에만 | [원문] | AI 패널엔 쓰지 않음(제자리 모션만) |
| 스크롤 연동 애니메이션은 금융 화면에서 피함 | [원문 · 기사] | 기존 규칙 그대로(`motion.md` §5) |

## 출처(연구 · 공식 문서만 — 서비스 화면 · 기사 링크는 비공개 조사 원본에)

- 지연 · 캐시: [RFC 5861](https://www.rfc-editor.org/rfc/rfc5861) · [Addressing cascading failures](https://sre.google/sre-book/addressing-cascading-failures/) · [The tail at scale](https://cacm.acm.org/research/the-tail-at-scale/) · [Histograms and summaries](https://prometheus.io/docs/practices/histograms/) · [arXiv 2305.05176](https://arxiv.org/pdf/2305.05176)
- 단타 · 이벤트 · 관계: [arXiv 2510.10775](https://arxiv.org/abs/2510.10775) · [2607.09426](https://arxiv.org/abs/2607.09426) · [2607.10932](https://arxiv.org/abs/2607.10932) · [2607.20645](https://arxiv.org/abs/2607.20645) · [2607.27070](https://arxiv.org/abs/2607.27070) · [2309.17322](https://arxiv.org/html/2309.17322) · [2601.05716](https://arxiv.org/html/2601.05716v2) · [2602.14233](https://arxiv.org/html/2602.14233v1) · [2603.12500](https://arxiv.org/html/2603.12500) · [NBER w20592](https://www.nber.org/papers/w20592) · [NBER w25882](https://www.nber.org/papers/w25882) · [SSRN 2460551](https://ssrn.com/abstract=2460551) · [SSRN 3450301](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3450301) · [SSRN 4478184](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4478184) · [SSRN 6579278](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6579278) · [SSRN 6725492](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6725492) · [SSRN 7227998](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=7227998) · [S0927538X08000309](https://www.sciencedirect.com/science/article/abs/pii/S0927538X08000309) · [S0927538X26000855](https://www.sciencedirect.com/science/article/abs/pii/S0927538X26000855) · [S0264999324000828](https://www.sciencedirect.com/science/article/pii/S0264999324000828) · [S1386418126000029](https://www.sciencedirect.com/science/article/pii/S1386418126000029)
- 투자자 행동: [자본시장연구원 보고서 1243](https://www.kcmi.re.kr/report/report_view?report_no=1243) · [1481](https://www.kcmi.re.kr/report/report_view?report_no=1481) · [NBER w22605](https://www.nber.org/papers/w22605) · [NBER w31317](https://www.nber.org/papers/w31317) · [NBER w28363](https://ideas.repec.org/p/nbr/nberwo/28363.html) · [SSRN 2212494](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=2212494) · [SSRN 3423101](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3423101)
- 확률 · 분포 그림: [강수확률 이해 doi 10.1175/wcas-d-19-0011.1](https://doi.org/10.1175/wcas-d-19-0011.1) · [Cognitive Research 2017](https://link.springer.com/article/10.1186/s41235-017-0076-1) · [PNAS 2020200117](https://www.pnas.org/doi/10.1073/pnas.2020200117) · [팬차트 이해(중앙은행 1998)](https://www.bankofengland.co.uk/-/media/boe/files/quarterly-bulletin/1998/the-inflation-report-projections-understanding-the-fan-chart.pdf)
- 모션: [Animation duration](https://www.nngroup.com/articles/animation-duration/) · [Skeleton screens](https://www.nngroup.com/articles/skeleton-screens/) · [M3 easing · duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) · [Fluent 2 motion](https://fluent2.microsoft.design/motion) · [WCAG 2.2 animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html) · [MDN View Transition API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API/Using) · [MDN animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline) · [MDN live regions](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Guides/Live_regions)

## 확인하지 못한 것

- 국내 공시(DART)의 일중 반응 · 국내 갭 · 김치 프리미엄 단타 — 믿을 만한 연구를 찾지 못함 → 우리 데이터로 사전등록 연구(`FC-REQ-028`)
- 증권 · 코인 앱 AI 카드의 실제 크기 · 모션 수치 — 앱 안 화면이라 기사로는 구성까지만. 웹 화면은 직접 쟀다(§5)
- 로컬 LLM 처리량 — 블로그끼리 어긋남, 우리 기계에서 재야 함. 우리 규모에선 요청 경로에서 빼는 것이 핵심
- "과한 모션이 금융 앱 신뢰를 해친다"를 직접 잰 동료심사 연구 — 없음(실무 문헌만)
