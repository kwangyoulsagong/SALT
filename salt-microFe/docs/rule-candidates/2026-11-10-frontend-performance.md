# 규칙 후보 — 프런트 성능: "지금 필요한 것만 먼저"

> **상태: 후보(아직 적용 안 함).** `.claude/rules/**` 에 넣기 전 보관본이다. 도입할 때 아래 "새로 넣을 것"만
> `performance-frontend.md` · `performance.md` 에 옮기고(200줄 상한), 이 파일 머리에 옮긴 날짜를 적는다.
>
> 출처: Sachin Patel, *Frontend Performance Optimization: A Practical Guide to Faster Web Pages*, JavaScript in Plain English, 2026-10-24
> (https://javascript.plainenglish.io/frontend-performance-optimization-a-practical-guide-to-faster-web-pages-c7a8d34fdbb5). 원문 번역이 아니라 우리 규칙 모양으로 요약했다.

## 한 문장

> 브라우저의 첫 몇 초는 대역폭 · CPU 가 모자란다. **"빠른가"가 아니라 "지금 일어나야 하나"를 묻는다** — 사용자가 처음 보는 것만 먼저, 나머지는 필요해질 때.

## 1. 이미 우리 규칙에 있는 것 (다시 적지 않는다)

| 글의 권고 | 우리 규칙 |
|---|---|
| 측정 → 가설 → 하나만 바꿈 → 다시 측정 → 유지 또는 되돌림 | `performance-frontend.md` §0 · §9(전후 수치 커밋) |
| 무거운 UI(라이트박스 · 서랍 · 상세 패널)는 열 때 동적 import | `performance-frontend.md` §3 · §7, `ssr.md`(데이터 뒤 잎은 effect 안 `import()`) |
| 서버 HTML 과 첫 클라이언트 렌더가 같은 배치 — 수화 뒤 배치 바꾸지 않음 | `ssr.md` · lint `@repo/fsd/no-render-read` |
| 스켈레톤은 실제 블록과 같은 높이 · 모양 | `streaming-ssr.md` §3 · `performance-frontend.md` §4 |
| `transform` · `opacity` 만 애니메이션 · 줄인 모션 존중 | `motion.md` §5 · §7 |
| 로딩 상태 `role="status"`, 아이콘 버튼 이름 | `a11y-policy.md` · `streaming-ssr.md`(`aria-busy`) |

## 2. 새로 넣을 것 (도입 후보)

| # | 규칙 | 왜 | 확인 방법 |
|---|---|---|---|
| P1 | **LCP 요소 하나만 우선** — 첫 화면 이미지 전부에 `fetchPriority="high"` · `priority` 를 주지 않는다. 실제 LCP 로 잡힌 요소 하나만 | 다 높으면 아무것도 우선이 아니다 — 큰 이미지 여럿이 대역폭을 다툰다 | DevTools Performance 의 LCP 요소 · 네트워크 순서 |
| P2 | `loading`(언제) 과 `fetchPriority`(얼마나 중요) 를 섞지 않는다 — 화면 밖 이미지는 `lazy`, LCP 는 `eager` + `high`. `fetchPriority` 는 힌트라 lazy 를 대신하지 않는다 | 둘이 푸는 문제가 다르다 | 코드 리뷰 grep |
| P3 | **크기를 맞춘 이미지** — `srcset` · `sizes`(또는 프레임워크 이미지 최적화). 잘 우선한 1.5MB 도 1.5MB 다 | 모바일이 데스크톱 이미지를 받는다 | Lighthouse "적절한 크기" |
| P4 | 목록 카드 캐러셀은 첫 장만, 나머지는 넘길 때. **불러오기 결정을 "지금 보이는 장"에 묶지 않는다**(넘길 때 다시 마운트 · 재다운로드 · 깜빡임) — 첫 렌더 전략에 묶는다. 전체 화면 갤러리는 반대(바로 옆 장을 미리) | 상호작용 모양이 전략을 정한다 | 넘기며 네트워크 탭 |
| P5 | **안 보이는 자리 애니메이션 0** — 자리 표시 반짝임은 정지가 기본, 화면에 가까워질 때만 | 숨은 슬라이드가 CPU 를 쓴다 | Performance 패널 |
| P6 | **글꼴 preload 는 주 UI 글꼴 하나만**, 장식 · 보조 글꼴은 preload 하지 않고 `font-display: swap` | preload = "이른 대역폭을 다툴 만큼 중요" 선언이다 | `<link rel=preload>` 수 |
| P7 | **제3자 스크립트(채팅 · 분석 · 지도)는 `load` → 유휴(`requestIdleCallback` + 시한) 뒤**, 단 사용자가 먼저 누르면 즉시 — "미루되 무한정 미루지 않는다" | 제3자 JS 가 LCP 와 다툰다. 누를 때까지 미루면 버튼이 안 듣는다 | 첫 로드 요청 목록에 제3자 0 |
| P8 | **iframe(지도 · 영상)은 크기 있는 자리 표시 먼저, `src` 는 가까워질 때** — 사용자가 열면 즉시 | iframe 은 문서 하나다 · 늦게 붙으면 CLS | CLS 0 · 첫 로드 iframe 0 |
| P9 | 스켈레톤을 **무거운 컴포넌트로 그리지 않는다** — 상자는 CSS 격자로 | 로딩 화면이 실제 UI 비용을 미리 낸다 | 번들 분석 |
| P10 | **수화 중 장식 애니메이션 0** — 애니메이션은 누른 뒤(찜 · 추가)에만 | 시작 비용 | Performance 패널 |
| P11 | 성능 변경은 **위험 · 복잡도 대비**로 고르고, 기대 개선이 안 나오면 되돌린다 — 도구 권고를 전부 따르지 않는다 | 한 지표를 위해 유지 비용을 올리는 일을 막는다 | 체크리스트에 전후 수치 |

## 3. 우리 화면에 걸리는 자리 (도입할 때 먼저 볼 곳)

- 종목 아이콘(코인 · 국내 로고) — 표 100행 · 검색 모달 · 홈 카드. P1~P3(LCP 아닌 로고에 높은 우선 없음 · 크기 맞춤)
- 상세 화면 `@repo/ui/tradingChart` — 이미 effect 안 `import()`. P5(안 보일 때 다시 그리지 않음)는 확인 필요
- 뉴스 기사 본문 모달 · 검색 모달 — P4 · P7 의 "누르면 즉시" 경로
- 768 미만 안내의 녹화 영상(`FE-REQ-061`) — P5 · P8 과 같은 생각(넓은 화면에서 요청 0)이 이미 들어 있다

## 4. 도입 체크리스트 (옮길 때)

- [ ] 위 P1~P11 중 무엇을 옮길지 고른다 — 셀 수 있는 것은 lint · 테스트로(`done-checklist.md` §4)
- [ ] 우리 화면 한 곳에서 전후 수치(LCP · CLS · 첫 로드 JS)를 잰다 — 안 줄면 옮기지 않는다
- [ ] `performance-frontend.md` 200줄 상한 안에서 표 행으로
