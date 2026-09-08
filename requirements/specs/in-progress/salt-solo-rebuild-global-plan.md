# SALT Private Edit-In-Place Global Plan

Created: 2026-09-08
Status: In Progress
Scope: **비공개 사적 이용** — 본인 + 초대된 지인 소수(≤10명). 공개 서비스 아님
Approach: **새로 짜지 않는다.** 지금 화면을 두고 뺄 것만 빼고 필요한 걸 더한다 (2026-09-08 방향 전환)

## 0. 한 줄 정의

> **SALT는 "지금 뭘 해야 하는지"를 한 화면에서 알려주는 개인용 투자 코치다. 추천에는 항상 근거·과거 적중률·틀렸던 사례가 붙고, 내 과거 결정의 값은 원화로 계산해서 보여준다.**

돈은 SALT에 들어오지 않는다. 매매는 업비트/증권사에서 직접 한다. SALT가 하는 일은 네 가지다.

1. **추천** — AI 코치가 매수/매도 타이밍을 근거와 함께 (FEATURE-004)
2. **한 숫자** — 이번 주 얼마 넣을지 (FEATURE-003)
3. **마감일** — 놓치면 세금으로 새는 날짜 (FEATURE-002)
4. **회계** — 내 개입이 실제로 얼마 벌었/잃었는지 (FEATURE-001)

목표는 기능을 늘리는 게 아니라 **토스 증권만큼 쉽게** 이 네 가지에 도달하는 것이다.

## 1. 법적 포지셔닝 (설계 제약)

사용자가 정확히 지적한 문제: **"조언"으로 읽히면 문제가 된다.** 그래서 범위와 말투를 먼저 못 박는다.

### 1-1. 이용 범위
- **비공개.** 앱스토어 출시 없음, 공개 URL 없음, 검색 노출 없음.
- **초대제.** 본인 + 지인 최대 10명. 초대 코드로만 계정 생성.
- **무료.** 수수료·구독료·성과보수 일절 없음.
- **각자 자기 계좌.** 지인도 자기 API 키/CSV를 자기가 등록한다. **타인 자산을 대신 조회·운용하지 않는다.**

### 1-2. 하지 않는 것 (영구 Non-Goals)
| 안 함 | 왜 |
|---|---|
| 주문 실행 / 자동매매 / 자금 보관 / 출금 | 금융투자업 요건에 걸리지 않기 위해. 조회 전용 API 키만 |
| 개별 종목 매수·매도 **지시** | 투자자문으로 읽힐 여지 제거 |
| 목표주가 / 수익률 예측 / 수익 보장 표현 | 동일 |
| 타인 자산 운용, 수수료 수취, 성과 공유 | 일임/유사수신 여지 제거 |
| 세무 신고 대행 | 세무대리 아님. 계산기 + 면책 |
| 신호 판매, 리딩방, 단체 채팅 | 동일 |

### 1-3. 추천은 한다 — 단 3개를 항상 붙인다

사용자 결정: **SALT는 "쉽게 투자 잘하게 해주는 추천·조언 플랫폼"이다.** AI 코치가 매수/매도 타이밍을 추천한다. 비공개·초대제·무료·조회전용이라는 1-1/1-2의 울타리 안에서, 추천을 빼지 않는다.

대신 **추천 카드에는 예외 없이 아래 3개가 붙는다.** 하나라도 없으면 렌더하지 않는다(컴포넌트 레벨 강제).

| 필수 동반 요소 | 왜 | 예시 |
|---|---|---|
| **근거** | 왜 그런 판단인지 사실로 | "MVRV Z −0.3(과거 4개 사이클 바닥 구간) · 비중 62%로 상한 초과 · RSI 28" |
| **과거 적중률** | 이 신호가 과거에 얼마나 맞았는지. `signal-performance` 재사용 | "이 유형 신호 최근 42회 · 승률 57% · 평균 +3.1% · 최대낙폭 −11%" |
| **틀렸던 사례** | 지표가 실패한 실제 시점 | "2025-10 사이클 톱에서는 이 지표가 매도 신호를 내지 못했습니다" |

**추가 규칙**
- 확신 표현 금지: "확실", "무조건", "보장", "100%" → 점수·확률·표본 수로만 표현.
- 목표주가·수익률 예측 금지. 대신 손절가/1차 익절가 같은 **내 규칙 기반 가격**만 표시.
- 2인칭 인격 평가 금지: "당신은 패닉셀러입니다" ❌ → "이 3건의 매도 후 90일 내 가격이 회복되었습니다. 합계 −890,000원" ⭕
- 모든 추천 카드에 **[근거 보기]** 가 있고, 펼치면 위 3개가 전부 나온다.
- 자산군별 규제 차이: 국내/미국 주식 개별 종목 추천은 **보유 종목의 비중·손절·세금**에 한정하고, 미보유 종목 신규 매수 추천은 **ETF/지수 단위**까지만 한다.

### 1-4. 면책
- 투자 판단·손실 책임은 본인. 화면 하단 고정 문구.
- 세금 계산은 참고용, 실제 신고는 세무 전문가 확인.
- 법령·거래소 정책은 바뀔 수 있고, 계산 전제는 전부 설정값으로 노출.

## 2. 접근 방식 — 편집, 재설계 아님

기획 도중 사용자 결정으로 방향이 바뀌었다.

> *"지금 화면에서 뺄 건 빼고 하자"* · *"사실 지금 있는 거 다 필요해 보이긴 해"* · *"현재 홈 화면은 이뻐서 그건 냅두고 싶어, 의미도 있고"*

실제 코드를 읽어보니 이 판단이 맞다. `/investments`는 실시간 가격·5분봉·심리 온도계·스마트 머니가 동작하고 변동률 blink 2초 같은 디테일까지 들어가 있다. 홈의 `AnalysisGraph`도 진입 애니메이션까지 구현되어 있다. 문제는 **기능 과잉이 아니라 (a) 깨진 채 방치된 부분과 (b) "그래서 지금 뭘 해야 하나"에 답하는 블록의 부재**다.

### 판정 축 (총 36건)

| 판정 | 건수 | 의미 |
|---|---|---|
| **유지** | 13 | 손대지 않는다. 홈 4블록 · 실시간 테이블 · 5분봉 · 게이지 · 색 토큰 · 원장 · 엔진 |
| **수리** | 9 | 깨진 것만 고친다. 빈 관심종목 탭 · 하드코딩 시각 · 더미 뉴스 · 오타 · 빈 "주식" 섹션 · 터치 선택 · 반응형 · `miniute` 오타 · 인증 |
| **추가** | 5 | 지금 화면의 탭과 블록으로 들어간다. 홈 상단 2줄 · `/investments` 탭 4개 · 적중률 한 줄 · AI 추천 카드 · 자산군 확장 |
| **빼기** | 5 | 화면 밖 죽은 코드만. 레거시 `AIAnalysis*` · 중복 `market-price-updater.worker` · 커밋된 빌드 산출물 · 근거 없는 `ACCOUNT_SELECTED` · 코드에 없는 기획 항목(랭킹·저축왕·소셜·게임) |
| **보류** | 4 | 지우지 않고 끈다. 미션/포인트/업적 · 알림 파이프라인 · 인사이트 랭킹/피드 · 대시보드. route만 비활성, model 유지 |

**중요: 화면이 없는 백엔드를 삭제하지 않는다.** 되살리는 비용이 커밋 하나여야 한다. 지인이 늘거나 필요해지면 다시 켠다.

## 3. 왜 "회계"에 걸어야 하는가 (리서치 근거)

새 기능의 근거는 "좋은 신호를 더 주자"가 아니다. 리서치가 일관되게 말하는 건 **정보 부족이 아니라 행동이 손실 원인**이라는 점이다.

- 1998~2025년 28년, 측정된 **모든 기간에 리테일 트레이더 74~89%가 손실**. 정보 접근성이 폭발적으로 개선된 기간에도 비율이 개선되지 않았다.
- 2025-08 리테일 크립토 트레이더 1,005명: **첫 1년 84% 손실**, 신규의 58%가 6개월 내 원금 대부분 소실. 초보 실수 1위 리서치 부족(55%), 2위 FOMO(44%).
- Morningstar *Mind the Gap 2025*: 펀드 수익률 연 8.2% vs 투자자 실현 수익률 연 7.0% → **연 1.2%p, 10년 수익의 약 15%가 타이밍으로 소실.** 변동성 큰 자산군에서 갭이 더 큼(상위 1.8%p vs 하위 0.8%p). 비트코인은 그 스펙트럼의 극단.
- 단 이 15%는 방법론 비판을 받았다(FAJ 2026, *Bad Timing Does Not Cost Investors 15%*). **그래서 SALT는 업계 평균을 인용하지 않고 내 계좌에서 계산한 값만 쓴다.** 그게 이 제품의 존재 이유다.

> 결론: SALT가 만들 수 있는 유일한 진짜 알파는 **"내 행동의 가격표"** 다. 시그널 정확도로 헤지펀드를 이길 수는 없지만, 내 패닉셀 3건에 원화 금액을 붙이는 건 가능하고 그 계산에 필요한 데이터는 이미 DB에 있다.

## 4. 자산군 3개를 같은 엔진으로

사용자 요구에 따라 **크립토 + 국내주식 + 미국주식**을 함께 다룬다. 세 자산군은 세금 규칙이 완전히 다르고, 바로 그 차이가 FEATURE-002의 가치다.

| | 크립토 | 국내주식 (소액주주) | 미국주식 |
|---|---|---|---|
| 양도차익 과세 | **2027-01-01 시행** 예정. 22%, 연 250만원 공제, 분리과세 | **비과세** (대주주 아니면) | **과세 중.** 22%, 연 250만원 공제 |
| 손익통산 | 가상자산 내 통산 | 해당 없음 | **해외주식 전체 합산 + 실현손실만** |
| 귀속연도 기준일 | 양도일 | — | **결제일 (미국주식 T+1)** |
| 연말 마감 | 2026-12-31까지 매도 = **비과세** (1회성) | — | **매년.** 2026년 귀속 마지막 = 12/30 매도 → 12/31 결제 |
| 취득가액 | 이동평균/선입선출. **2027 전 보유분은 max(실제, 2026-12-31 시가)** | — | 결제일 기준환율 원화 환산 |
| 그 외 | — | 증권거래세 0.15%→**0.20%(2026 인상)**, 배당 15.4% 원천징수, 금융소득 2,000만원 초과 시 종합과세 | 배당 15% 원천징수(현지) |

**여기서 나오는 실전 결론 4개 — 전부 계산 가능하고, 놓치면 그냥 돈이 새는 것들:**

1. **미국주식 연말 손실 수확.** 올해 실현차익 500만원이면 세금 55만원. 평가손실 300만원 종목을 **연내 결제까지** 실현하면 통산 후 200만원 → 250만원 공제 안 → **세금 0원.** 실현하지 않으면 그 손실은 올해 계산에 안 들어온다.
2. **결제일 함정.** 12/31 매도는 결제가 다음 해로 넘어가 **내년 귀속**이 된다. 2026년 귀속 마지막 기회는 **12/30 매도 → 12/31 결제**이고, 증권사 처리 차이 때문에 실무 권고는 **12/29까지**. 하루 착각하면 250만원 공제 한 해분을 날린다.
3. **환율 함정.** 해외주식 원화 환산은 매수·매도 **각 결제일 기준환율**로 한다. 그래서 **달러로 손실인데 원화로 이익이 나서 세금이 나오는 경우가 실제로 있다.** 이걸 미리 보여줄 수 있다.
4. **크립토 연내 매도 비과세 + 취득가액 스텝업.** 2026-12-31까지 매도 차익은 비과세. 반대로 평가익 상태로 연말을 넘기면 취득가액이 연말 시가로 올라간다(스텝업). 어느 쪽이 유리한지는 수량·평단·현재가·향후 매도시점의 함수 → **손익분기점을 계산해서 보여준다.** 어느 쪽도 추천하지 않는다.

## 5. 신규 기능 5개

| # | 기능 | 한 줄 | 참신성 |
|---|---|---|---|
| **FEATURE-001** | **개입 청구서 (My Alpha)** | 내 계좌를 "아무것도 안 했을 때"·"기계적 적립했을 때"와 나란히 놓고 차액을 원화로. 모든 거래에 가격표를 붙이고 합이 총액과 정확히 일치(항등식, 잔차 0) | 리서치 확인 결과 **개인 계좌 단위 반사실 손익을 거래별 원화로 귀속하는 리테일 앱은 없다.** 반사실 논의는 기관 문헌에만 있고 리테일 앱은 "수익률 표시"에서 멈춘다 |
| **FEATURE-002** | **연말 세금 마감 콕핏** | 자산군별 마감 D-Day, 미국주식 **손실 수확 솔버**(250만원 공제에 정확히 맞추는 매도 조합), 환율 환산 함정 경고, 크립토 스텝업 손익분기, 증빙 아카이브 | **한국 세법 3종을 한 엔진에 넣고 "결제일 기준"과 "환율 기준"까지 반영한 계산기는 없다.** 글로벌 앱은 한국 세법을 안 다루고, 국내 계산기는 자산군별로 흩어져 결제일·환율을 뭉갠다 |
| **FEATURE-003** | **밸류에이션 밴드 적립** | "이번 주 얼마 넣을지" 딱 한 숫자. BTC는 MVRV Z, 미국주식은 CAPE 백분위로 적립 배수 0x~3x. 김프는 매수 비용으로 차감 | 지표 차트는 흔하지만 **"그래서 이번 주 내 통장에서 얼마"라는 단일 실행 숫자 + 지표 실패 이력 병기**는 없다 |
| **FEATURE-004** | **AI 코치 추천 화면** | 이미 서버에만 있는 `ai-coach` / `signal-performance` / `profit-plan` / `trade-preflight`를 화면으로. 매수·매도 타이밍 추천 + 1-3절 3종 세트(근거·적중률·실패사례) | 백엔드가 완성돼 있는데 **화면이 없어서 0원**인 상태. 신호에 자기 성적표를 붙여서 보여주는 코치는 드물다 |
| **FEATURE-005** | **홈 브리핑 & 4탭 IA** | 화면 24개 → 4탭. 홈은 "오늘 볼 것 3줄". 토스 증권 수준의 단순함 | 축소 자체가 기능 |

### 범위에서 제외된 것
- ~~서약 카드 / Ulysses Contract / 쿨다운 타이머~~ — **제외.** 사용자 결정. 앱이 사용자 행동을 통제·차단하는 메커니즘 전체를 뺀다.
- FEATURE-001의 행동 라벨은 유지하되 **사실 서술로만** 렌더한다(1-3절).

## 6. 변경 금지 목록

아래는 **리팩터링 편의를 이유로도 바꾸지 않는다.** 작업 전/후 스크린샷 비교가 수용 기준이다.

| 대상 | 근거 |
|---|---|
| 홈 목표 진행 카드 · `AnalysisGraph` 카테고리 막대 · `TipsApp` 금융 팁 · 프로필 헤더 | 사용자 명시: "이뻐서 냅두고 싶어, 의미도 있고" |
| 실시간 테이블 5컬럼 · 정렬 5 / 순서 2 / 기간 7 필터 · 별 아이콘 · 로고 · **변동률 blink 2초** · `limit=100` | 완성도가 가장 높은 화면 |
| `PreviewChart` 5분봉 + 실시간 캔들 수신 | 동작 확인됨 |
| 심리 온도계 · 스마트 머니 원형 게이지 | 시각·정보 모두 유효. **적중률 한 줄만 덧붙임** |
| 2컬럼 레이아웃 (좌측 테이블 + 우측 392px 프리뷰) | PC 그대로. 모바일에서만 접힘 |
| 색 토큰 — 상승 `#FF2E55` / 하락 `#1677EE` / 브랜드 `#007AFF` / 배경 `#F2F4F6` | 신규 화면도 이 규칙을 따른다 |
| `PortfolioTransaction` · `PortfolioHolding` · `PriceHistory` | 모든 신규 기능의 원장. row 수 보존 |
| `ai-coach` score engine + Gemini explainer · `signal-performance` · `profit-plan` · `trade-preflight` · `behavior-coach` | 제품의 핵심 엔진 |
| `packages/ui` · `message-event-bus` | 그대로 |

## 7. 정보 구조 — 지금 구조에 얹는다

### 홈 (`/`) — 블록 순서 유지 + 최상단 2줄
```text
＋ 이번 주 적립 475,000원          ← 추가 (FEATURE-003)
＋ 세금 마감 D-112 / D-114 / 비과세  ← 추가 (FEATURE-002)
  프로필 헤더                       유지
  목표 진행 카드                    유지
  투자 분석 (지난주 대비 + 막대)     유지 · 오타만 수리
   └ "주식" 섹션                    수리 — 보유 요약으로 채움
  오늘의 금융 팁                    유지
```

### 투자 페이지 (`/investments`) — 탭 뒤에 4개 추가
```text
실시간 차트 | 관심 종목 | ＋AI 코치 | ＋내 청구서 | ＋세금 마감 | ＋포지션
   ↑유지        ↑수리      ↑FEATURE-004  ↑FEATURE-001  ↑FEATURE-002  ↑FEATURE-005

실시간 차트 탭 내부 (레이아웃 유지):
  필터 3그룹                        유지
  좌: 실시간 테이블                 유지 · 헤더 시각/터치 선택 수리
  우: MarketPreview                 유지
      ├ 종목 헤더 + 5분봉           유지
      ├ 심리 온도계                 유지 ＋적중률 한 줄
      ├ 스마트 머니 게이지          유지 ＋적중률 한 줄
      ├ ＋AI 추천 카드              추가 (근거·적중률·실패사례)
      └ 뉴스                        수리 — 실데이터 연결
```

### 모바일 — 같은 정보를 접는다
```text
하단 탭바 5개: 홈 · 코치 · 청구서 · 세금 · 포지션
표는 자체 가로 스크롤 · 우측 프리뷰는 아래로 접힘 · 행 선택은 탭
```

## 8. 데이터 소스

| 자산군 | 원장(거래·잔고) | 시세 | 비고 |
|---|---|---|---|
| 크립토 | 업비트 거래내역 CSV(1순위) + 조회 전용 Open API Key | 업비트 WS/candles | API Key는 계정당 10개, 키당 허용 IP 10개. **주문/출금 권한 키는 등록 거부** |
| 국내주식 | 한국투자증권 **KIS Developers** 오픈API(계좌 잔고·체결내역 GET) + 증권사 CSV | KIS 시세 | 무료 오픈API. 조회 전용 사용. 종합/모의계좌 선택 가능 |
| 미국주식 | 동일 (KIS 해외주식) + 증권사 거래내역 | KIS 해외 시세 | 환율은 별도 소스 필요(결제일 기준환율) |
| 환율 | — | 결제일 기준환율 소스 확정 필요 (Open Question) | 세금 계산 정확도의 핵심 |
| 밸류에이션 | MVRV Z / Puell(크립토), CAPE(미국) | 외부 지표 소스 | 갱신 주기 일 1회로 충분 |

**공통 원칙: 모든 외부 연동은 조회 전용.** 주문 권한이 있는 키는 저장하지 않고, 스코프 검사 후 거부한다.

## 9. 실행 순서

| 단계 | 작업 | 산출물 | 선행 |
|---|---|---|---|
| S0 | 범위 정리 — 제거 대상 삭제, `AssetType` 확장, MFE 2앱 축소, 초대제 인증 | FEATURE-000 | — |
| S1 | **원장 신뢰 확보** — 업비트 CSV/API + KIS 국내·미국 import, 중복 제거, 홀딩 재계산, 환율 원장 | FEATURE-001 Phase 1 | S0 |
| S2 | **세금 콕핏** — D-Day가 짧아 최우선. 미국주식 손실수확 솔버 → 크립토 스텝업 | FEATURE-002 | S1 |
| S3 | 반사실 엔진 + 청구서 화면 | FEATURE-001 Phase 2 | S1 |
| S4 | 밸류에이션 밴드 + 김프 | FEATURE-003 | S1 |
| S5 | AI 코치 화면 | FEATURE-004 | S1 (S2~S4와 병행 가능) |
| S6 | 홈 상단 2줄 + `/investments` 탭 4개 + 모바일 탭바 | FEATURE-005 | S2~S5 |

> **S1이 모든 것의 병목이다.** 원장이 부정확하면 청구서와 세금 계산이 전부 거짓말이 된다.
> **S2를 S3보다 먼저** 한다: 2026-12-29~30이 하드 마감이고 지금 D-112~114다. 청구서는 마감이 없다.

## 10. 남은 일정 (하드 마감)

| 날짜 | 무엇 | D-Day (2026-09-08 기준) |
|---|---|---|
| 2026-12-29 (화) | 미국주식 손실 수확 실무 권고 마감 | **D-112** |
| 2026-12-30 (수) | 미국주식 2026년 귀속 마지막 매도(12/31 결제) | **D-113** |
| 2026-12-31 (목) | 크립토 비과세 매도 마감 / 의제취득가액 기준일 | **D-114** |
| 2027-01-01 | 크립토 과세 시행(현행법) + 2026-12-31 시가 스냅샷 수집 | D-115 |
| 2027-05-01~06-01 | 2026년 귀속 해외주식 양도소득세 신고 | — |

## 11. Global Acceptance

- [ ] **변경 금지 목록(6절)이 시각적으로 변하지 않았다** — 작업 전/후 스크린샷 비교 통과.
- [ ] 화면이 없는 백엔드의 Prisma model이 삭제되지 않았다(보류 검증).
- [ ] 홈 최상단 2줄에서 "이번 주 얼마"와 "언제까지"가 바로 보인다.
- [ ] 모든 신규 기능이 **주문을 실행하지 않는다.** 조회 전용 키만 저장되고, 주문/출금 권한 키는 등록 거부된다.
- [ ] 모든 AI 추천 카드에 근거·과거 적중률·실패사례 3종이 함께 렌더된다(하나라도 없으면 렌더 불가).
- [ ] 모든 지표 화면에 해당 지표의 과거 실패 이력이 함께 표시된다.
- [ ] 세금 화면 전체에 면책 문구가 노출되고, 세율·공제·시행일·기준일이 전부 설정값으로 표시된다.
- [ ] 3자산군(크립토/국내주식/미국주식) 보유가 한 화면에 원화 기준으로 합산 표시된다.
- [ ] 초대 코드 없이 계정이 생성되지 않는다.

## 12. Risks

| 리스크 | 대응 |
|---|---|
| 추천이 법적 문제가 됨 | 1-1/1-2의 울타리(비공개·초대제·무료·조회전용·타인자산 미취급) + 1-3의 3종 세트 강제 + 면책. 공개 배포·수익화 시 이 설계를 다시 검토해야 함 |
| 크립토 과세가 국회에서 재유예/폐지 | 시행일·세율·기준일 전부 설정값. 유예 시 D-Day 자동 재계산. 폐지 시 해당 화면을 "취득가액 원장"으로 용도 변경 |
| 결제일/환율 규칙 오구현 → 세금 계산 오류 | 면책 + 계산 전제 전면 노출 + 국세청 예규 확인을 Open Question으로 명시. 단정적 문구 금지 |
| 원장 부정확 → 전 기능 신뢰 붕괴 | S1을 병목으로 명시, 잔고 대조 검증(FEATURE-001 FR-2), 불일치 시 `degraded` 배너 |
| 지표 과신(2025-10 톱에서 온체인 지표 전부 실패) | 실패 이력 병기 의무화 |
| 청구서가 자책 도구가 됨 | 잘한 개입도 같은 비중으로 표시(FEATURE-001 FR-11). 점수·등급·벌점 금지 |
| KIS API 정책/한도 변경 | CSV import를 항상 1순위 경로로 유지. API는 편의 기능 |

## 13. Source Specs

| Area | Document |
|---|---|
| PM | `pm/requirements/specs/in-progress/FEATURE-000-scope-reset.md` |
| PM | `pm/requirements/specs/in-progress/FEATURE-001-intervention-invoice.md` |
| PM | `pm/requirements/specs/in-progress/FEATURE-002-tax-deadline-cockpit.md` |
| PM | `pm/requirements/specs/in-progress/FEATURE-003-valuation-band-accumulation.md` |
| PM | `pm/requirements/specs/in-progress/FEATURE-004-ai-coach-screen.md` |
| PM | `pm/requirements/specs/in-progress/FEATURE-005-home-briefing.md` |
| PM | `pm/storyboard/SALT-Storyboard(20260908-1557).html` — 인터랙티브 화면 스토리보드 (탭 5개 + 상세 7개 + 기능 판정 보드) |
| Feature map | `pm/features/current-feature-map.md` |

## 14. 리서치 출처

**행동/손실**
- [Retail Traders Lost 74-89% During Every Major Volatility Event (1998–2025)](https://hedgefundalpha.com/news/retail-traders-lost-volatility-event/)
- [Study: 84% of Retail Crypto Traders Lose Money in Their First Year](https://nftevening.com/84-percent-of-retail-crypto-traders-lose-money-in-their-first-year/)
- [Morningstar — Mind the Gap 2025](https://www.morningstar.com/business/insights/research/mind-the-gap)
- [CNBC — Investors lose out on 15% of fund returns](https://www.cnbc.com/2025/10/27/morningstar-research-investors-lose-out-on-mutual-fund-etf-returns.html)
- [FAJ/CFA 2026 — Bad Timing Does Not Cost Investors 15%](https://rpc.cfainstitute.org/research/financial-analysts-journal/2026/bad-timing-does-not-cost-investors-funds-returns)
- [Goodreid — Investment Sell Discipline: Counterfactual "What-If" Scenarios](https://www.goodreid.com/investment-sell-discipline-exploring-the-counterfactual-%E2%80%9Cwhat-if%E2%80%9D-scenarios.html)
- [HackerNoon — Crypto Portfolio Tracking Is Broken. It Needs to Become Action-Aware](https://hackernoon.com/crypto-portfolio-tracking-is-broken-it-needs-to-become-action-aware)

**크립토 세금 (한국)**
- [아시아경제 — 가상자산 과세 유예안 빠져, 내년부터 22% 분리과세 (2026 세제개편, 2026-08-03)](https://view.asiae.co.kr/article/2026080308361151042)
- [디지털애셋 — '2027년 시행' 가상자산 과세, 연말 국회 문턱 넘을까](https://www.digitalasset.works/news/articleView.html?idxno=42372)
- [국세청 — 거주자의 가상자산소득 과세 개요](https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=40370&cntntsId=238935)
- [경제적 자유를 위한 연습장 — 2026년 말까지 확인할 취득가액과 거래기록](https://wisdom-spot.com/posts/crypto-tax-korea-2027)
- [뉴스1 — 가상자산 과세 '운명의 갈림길': 폐지안·3년 유예안](https://www.news1.kr/politics/assembly/6255583)

**해외/국내주식 세금**
- [유안타증권 — 해외주식 양도소득세 안내](https://www.myasset.com/myasset/static/investinfo/IN_1104000_P1.jsp)
- [토스뱅크 — 해외주식 양도소득세, 신고 기한부터 납부 방법까지](https://www.tossbank.com/articles/overseas-capital-gains-tax)
- [eorim — 해외주식 양도소득세 절세: 손익통산과 250만원 공제, 연말 체크 (2026)](https://eorim.com/blog/year-end-tax)
- [월간카카오 — 해외주식 양도소득세 언제까지 매도해야 할까 (기준일·집계일)](https://kakaomagazine.com/%ED%95%B4%EC%99%B8%EC%A3%BC%EC%8B%9D-%EC%96%91%EB%8F%84%EC%86%8C%EB%93%9D%EC%84%B8-%EC%96%B8%EC%A0%9C%EA%B9%8C%EC%A7%80-%EB%A7%A4%EB%8F%84%ED%95%B4%EC%95%BC-%ED%95%A0%EA%B9%8C%EA%B8%B0%EC%A4%80/)
- [브런치 — 해외주식 양도세 환율 적용 시점(결제일)](https://brunch.co.kr/@ironbell/66)
- [비즈워치 — 손실 난 미국주식도 환율 때문에 세금 낼 수 있다](https://news.bizwatch.co.kr/article/market/2024/05/07/0029)
- [국세청 예규 국제세원 229 — 해외주식 양도차익 외화환산시 환율 적용 방법](https://casenote.kr/%EA%B5%AD%EC%84%B8%EC%B2%AD/%EA%B5%AD%EC%A0%9C%EC%84%B8%EC%9B%90-229-2f375e)
- [세무법인 가치 — 2026년 해외주식 양도소득세 신고·계산·절세 가이드](https://www.valuetax.co.kr/2026%EB%85%84-%ED%95%B4%EC%99%B8%EC%A3%BC%EC%8B%9D-%EC%96%91%EB%8F%84%EC%86%8C%EB%93%9D%EC%84%B8-%EC%8B%A0%EA%B3%A0%C2%B7%EA%B3%84%EC%82%B0%C2%B7%EC%A0%88%EC%84%B8-%EC%99%84%EB%B2%BD-%EA%B0%80/)
- [KB — 국내 주식 세금 총정리: 양도소득세·배당소득세·증권거래세](https://kbthink.com/main/asset-management/wealth-manage-tip/kbthink-original/202410/kr-stocktax.html)
- [라이프핀 — 국내주식 세금 기준 2026: 거래세·배당세 15.4%·대주주 양도세](https://lifefin.co.kr/%EA%B5%AD%EB%82%B4%EC%A3%BC%EC%8B%9D-%EC%84%B8%EA%B8%88-%EA%B8%B0%EC%A4%80/)

**적립 전략/밸류에이션**
- [Bitcoin Observatory — When to Stack, When to Spread (파워로 1.25x 레짐)](https://btcpowerlaw.nl/research/lump-sum-vs-dca/)
- [Crypto DCA Strategy: 12-Year Backtest, Fear Markets](https://www.spotedcrypto.com/crypto-dca-strategy-backtest-guide/)
- [MVRV Z-Score | Look Into Bitcoin](https://www.lookintobitcoin.com/charts/mvrv-zscore/)
- [MVRV Z-Score Explained — called every major top and bottom](https://www.tradingcopilot.app/blog/mvrv-z-score-explained-crypto)
- [Bitcoin On-Chain Bottom Signals (2026-03)](https://www.spotedcrypto.com/bitcoin-onchain-bottom-signals-march-2026/)
- [Bitcoin Magazine — Six On-Chain Indicators (Puell Multiple)](https://bitcoinmagazine.com/markets/exploring-six-on-chain-indicators-to-understand-the-bitcoin-market-cycle)
- [Lyn Alden — The Shiller PE (CAPE) Ratio](https://www.lynalden.com/shiller-pe-cape-ratio/)
- [GuruFocus — S&P 500 Shiller CAPE Ratio 41.04 (2026-09)](https://www.gurufocus.com/economic_indicators/56/sp-500-shiller-cape-ratio)
- [Invesco — The Shiller P/E and S&P 500 returns revisited](https://www.invesco.com/apac/en/institutional/insights/market-outlook/applied-philosophy-the-shiller-PE-and-SP-500-returns-revisited.html)
- [Current Market Valuation — S&P 500 P/E & CAPE Model](https://www.currentmarketvaluation.com/models/price-earnings.php)

**김치 프리미엄**
- [Bloomberg — Bitcoin 'Kimchi Premium' Is Back (2026-09-01)](https://www.bloomberg.com/news/articles/2026-09-01/bitcoin-kimchi-premium-is-back-as-south-korean-market-stirs)
- [Kimchi Premium in 2026: From −2.15% Negative Premium to Trading Opportunities](https://www.spotedcrypto.com/kimchi-premium-guide-2026/)
- [CoinGecko — Why the Kimchi Premium Exists](https://www.coingecko.com/learn/kimchi-premium)

**API**
- [업비트 개발자 센터 — Open API Key](https://docs.upbit.com/kr/docs/api-key)
- [Upbit Developer Center — Rate Limits](https://global-docs.upbit.com/reference/rate-limits)
- [KIS Developers — 한국투자증권 오픈API 개발자센터](https://apiportal.koreainvestment.com/apiservice)
- [파이썬으로 배우는 KIS 오픈API 트레이딩](https://wikidocs.net/159296)

## 변경 이력

| 날짜 | 변경 |
|---|---|
| 2026-09-08 | 초안 작성 (1인 사용자 재정의, 제거 목록, 신규 기능 5개) |
| 2026-09-08 | **서약 카드(FEATURE-002) 범위 제외** — 사용자 결정. 행동 통제 메커니즘 전체 제거 |
| 2026-09-08 | **법적 포지셔닝 1절 추가** — 비공개·초대제·무료·조회전용·말투 게이트 |
| 2026-09-08 | **방향 전환 — 재설계에서 편집으로.** 사용자 결정에 따라 판정 축을 유지/수리/추가/빼기/보류로 재정의(36건). 실제 삭제는 화면 밖 죽은 코드 5건. 화면 없는 백엔드는 보류(동면). 홈 시각 구성·투자 페이지 레이아웃을 변경 금지 목록으로 명시. 신규 기능은 홈 상단 2줄 + `/investments` 탭 4개로 편입 |
| 2026-09-08 | **추천 유지 결정** — 1-3절을 "금지"에서 "근거·적중률·실패사례 3종 강제"로 전환. AI 코치 화면(FEATURE-004)과 홈 브리핑(FEATURE-005) 분리, 5탭 IA |
| 2026-09-08 | **국내주식/미국주식 자산군 추가** — 세금 규칙 3종 비교(4절), 결제일·환율·손실수확 근거, KIS API 데이터 소스. 기능 재번호 001~004 |
