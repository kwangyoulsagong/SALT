# ADR-012 — 휴대폰은 앱이 아니라 PWA: 같은 origin `/m/*` 전용 zone 하나

- 상태: **채택 (사용자 결정 2026-11-20)** — *"모바일은 없애기로 했어"* · *"요구사항이랑 모바일 코드 파일 다 삭제"* · *"그대신 pwa로 할생각이야"* ·
  *"pwa에도 전용 마이크로프론트엔드로 하고 서로 url이 다를듯"* · *"rn 하고 하면 sdk 설치하고 하면 너무 무거워서"*
- 날짜: 2026-11-20
- 근거 기능: `FEATURE-019` · 리서치 `requirements/reports/research/2026-11-20-pwa-mobile-zone.md`
- 뒤집는 것: React Native 앱(옛 `RN-REQ-001` — 후보 D "웹 PWA" 를 iOS 웹 푸시 제약으로 버렸던 판단) · `FEATURE-007` 모바일 앱 · 앱 웹뷰 계약(`SALTApp/` UA, `FE-REQ-043` FR-6)
- 개정하는 것: `ADR-005` §1 "zone = 도메인" — **화면 표면(surface) zone 하나** 예외(§2)
- 그대로 두는 것: `ADR-005` 도메인 zone 넷 · 운영 공용 `/_next`(규칙 7) · `ADR-008` 한 origin 경로 라우팅 · 마스터 인덱스 §6 공통 수용 기준

## 1. 맥락

- 앱(Expo + EAS)은 착수 전이었다 — 코드 0, 문서만 RN 49개 + F007 13개. 이 맥에는 Xcode(명령줄 도구뿐) · Android SDK 가 없다. 실기기 기동 · 콜드 스타트라는 done 기준을 닫으려면 툴체인 설치부터 해야 하고, 전담 없는 1인 · 포폴 규모에 그 무게가 제품보다 크다(사용자 "너무 무거워서")
- 2026-09 에 PWA 를 버린 이유(iOS 웹 푸시)는 바뀌었다 — iOS 16.4+ 홈 화면 웹앱은 웹 푸시를 받고, 18.4+ 는 서비스 워커 없이도 알림을 띄운다(Declarative Web Push). iOS 26 은 홈 화면에 추가한 사이트를 기본 웹앱으로 연다
- 앱 웹뷰용으로 만든 휴대폰 배치(`FE-REQ-060` FR-M — 가계부 · 저축 · 홈 한 열 · 하단 버튼 → 시트 · `appType` 글자 토큰, 2026-11-20)가 이미 있다 — 데스크톱과 같은 HTML 에 CSS 로 갈라 넣었다

## 2. 결정

**휴대폰 화면은 같은 origin `/m/*` 를 서비스하는 PWA zone 하나(`apps/web-mobile`)가 맡는다. 데스크톱 URL 과 주소가 다르다.**

| 항목 | 정한 것 | 근거 |
|---|---|---|
| 주소 | `/m/home` · `/m/goals` · `/m/household` · `/m/investments/...` · `/m/login`(설치 앱 안 로그인 — iOS 는 Safari 와 저장소를 나눈다) | 사용자 선택 · 리서치 §1 |
| zone | 표면 zone 하나 — 화면은 도메인 패키지가 **`mobile` 진입점**(`@repo/domain-<x>/mobile/<page>`)으로 내고 zone 은 조립만. `/m` 안 이동은 soft navigation | 리서치 §2 안 A — 도메인별 모바일 zone 은 탭마다 문서 이동 · 서비스 워커 주인이 애매 |
| 홈 | 셸처럼 도메인 패키지를 보지 않는다 — BFF `HomeSummaryCard[]` 로 | `ADR-005` 규칙 2 와 같은 선 |
| 공개 `/tips` | `/m` 에 두지 않는다 — 한 URL 반응형(휴대폰 폭 배치를 그 화면이 가짐) | Google 분리 URL 지침 · 공개 SEO 화면 |
| basePath | 쓰지 않는다 — 다른 zone 처럼 라우트가 `/m` 아래(`app/m/**`). dev assetPrefix `/mobile-static` · 운영 공용 `/_next` | `ADR-005` 규칙 7 을 그대로 지킨다 |
| 이동 | 데스크톱 URL 을 휴대폰으로 열면 **문서 이동(GET)만** 대응 `/m` 주소로 302(한 방향 · `Vary` · `private`), "데스크톱 화면으로 보기" 쿠키를 존중, 대응 화면이 없으면 이동하지 않고 768 미만 안내("데스크톱으로 이동해 주세요") | 리서치 §2 판별 |
| 판별 | `Sec-CH-UA-Mobile` 이 있으면 그것, 없으면 UA `Mobile`/`iPhone` · 태블릿은 데스크톱 | 리서치 §2 |
| 매니페스트 | `id` · `scope` = `"/m/"`(끝 슬래시) · `start_url` `/m/home` · `standalone` · `<link rel="manifest">` 는 `/m` 페이지에만 | MDN scope 접두 일치 |
| 서비스 워커 | `/m/sw.js` · `scope: '/m/'` — 루트 범위 SW 를 만들지 않는다 · 정적 파일과 오프라인 한 장만 precache · HTML · RSC · API 는 네트워크만 | Cache API 는 캐시 헤더를 무시 · RSC `Vary` 함정 |
| 오프라인 | **화면마다 마지막으로 본 숫자 한 벌 + 받은 시각**을 사용자 키로 IndexedDB 에 — "오프라인 · 시각 기준" 띠와 함께. 로그아웃 · 다른 계정이면 지움. 쓰기 오프라인 큐 없음 | 사용자 결정 2026-11-20 "마지막 화면 한 벌만" |
| 푸시 | 웹 푸시(VAPID) — 설치 앱 안에서 누를 때만 구독 · 푸시마다 알림 · Declarative 형식 + SW 처리 · 404/410 구독 삭제. 도메인별 · 기본 꺼짐(`FEATURE-015` FR-4 그대로) | 리서치 §1 |

## 3. 선택하지 않은 것

| 안 | 버린 이유 |
|---|---|
| React Native(Expo) | §1 — 툴체인 무게. 되살리려면 이 ADR 을 뒤집는 새 ADR |
| 반응형 한 URL(데스크톱 화면이 휴대폰 폭도) | 사용자 선택(전용 zone · 다른 URL). 데스크톱 화면에 휴대폰 분기가 쌓인다(지금 웹뷰 배치가 그 모양) |
| 서브도메인 `m.` | origin 이 달라 쿠키 · CORS · `ADR-008` 라우팅을 고쳐야 한다 |
| 도메인마다 모바일 경로(`/goals/m`) | 하단 탭 이동이 전부 문서 이동 · PWA 하나가 zone 다섯에 흩어짐 |
| 개인 데이터 오프라인 저장 0 | 사용자 결정(마지막 화면 한 벌) |

## 4. 결과

- 삭제: 옛 `RN-REQ-*`(스펙 · 체크리스트 · 회고) · 규칙 `rn-architecture.md` · `rn-microfrontend.md` · `performance-rn.md` · `FEATURE-007` 와 영역 REQ(`BFF-REQ-031`~`034` · `SRV-REQ-032`~`035` · `DB-REQ-025`~`028`). done 폴더 · 리포트의 옛 언급은 기록으로 둔다
- 앱 웹뷰 계약(`SALTApp/` UA · `data-embed` · `IN_APP_WEBVIEW`)은 PWA zone 으로 화면을 옮기는 슬라이스(`FEATURE-019` 순서 2)에서 걷는다 — 그때까지 코드는 그대로 돈다(쓰는 앱이 없을 뿐)
- `screen-mobile.md` 는 대상이 "RN · 앱 웹뷰" → "PWA `/m`" 으로 바뀐다
- `ADR-005` §1 에 표면 zone 행 · 레이어 규칙(`layer-rules.cjs`)에 "모바일 zone → `domain-*/mobile` 진입점만" 행

## 5. 되돌리는 법

- PWA zone 을 접으려면 레지스트리에서 `mobile` 항목을 지우고 이동 미들웨어를 끈다(설정 한 줄) — 데스크톱 zone 은 영향 없음
- 앱으로 돌아가려면 새 ADR. 지운 RN 문서는 git 기록(이 ADR 커밋)에서 되살린다
