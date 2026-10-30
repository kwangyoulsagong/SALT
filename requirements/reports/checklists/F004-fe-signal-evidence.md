# F004 슬라이스 17 — 판정 근거 상세 체크리스트

| 요구 | 구현 | 확인 |
|---|---|---|
| `BFF-REQ-039` FR-8 분포 전달 | `judgment-scoreboard.viewmodel.ts` `toDistribution` | 단위 테스트: 서버 순서가 뒤집혀 와도 구간 순서 · 구간 누락 · 음수 · 소수 · `horizonDays` 0 · 배열 아님 → `null` · 사분위 하나만 비면 그 칸만 `null`. BFF 실응답 3그룹 구간 합 = 표본(3 · 4 · 47) |
| FR-141 성적 4칸 + 분포 6구간 + 표 대체 | `entities/coach/ui/SignalEvidence.tsx` `SignalMetrics` · `ReturnDistributionBars` | 실화면 `scalp.wait` 47회 · 55% · −1.7% · −9.6% · 막대 38 · 9 (가장 나빴던 −9.6% 가 −10~0% 구간과 맞음) · `sr-only` 표 캡션 "판단 뒤 하루 수익률 구간별 채점 횟수" |
| FR-141 기간은 그룹 기준 | `horizonDays` → "판단 뒤 하루" · "판단 뒤 30일" | `scalp.wait` 제목 "판단 뒤 하루 수익률 분포" · `long_term.wait` "판단 뒤 30일 수익률 분포" |
| FR-142 맞았던 때 · 틀렸던 때 같은 크기 | `SignalCaseColumns` — 같은 `CaseColumn` 두 번 | 1440 두 칸 같은 너비 · 390 위아래 · 접기 · 더보기 0 |
| FR-144 코드 원문 0 | `signalTypeLabel` 매핑 없으면 "기록 없음" | `/coach/signals/bogus.key` → 제목 "판정 근거" · "이 판단 유형의 채점 기록이 없어요" |
| 표본 부족 | 서버 `lowSample` → 비율 셋 "표본 적음" + 이유 | `long_term.wait`(3회) · `scalp.avoid`(4회) |
| 분포 `null` | 막대 대신 이유 | route 로 분포 `null` → "수익률 분포를 아직 받지 못했어요" · 사례는 그대로 |
| 실패 · 로그아웃 | `useJudgmentScoreboard` 분기 | route 500 → "지금은 판정 근거를 불러올 수 없어요" · 제목은 URL 키로 남음 |
| 진입 링크 | `ScoreboardList` 그룹마다 `Link` + `NavChevron` · `aria-label` "<이름> 판정 근거 자세히 보기" | 리포트 링크 3개 → 클릭 시 `/coach/signals/long_term.wait` 이동(1440 · 390) |
| 확률 · 기대 수익 문구 0 | 메시지 grep · BFF 테스트 `probability` 필드 없음 | 화면 글자 확인 |
| 접근성 | 새 글은 AA 스타일(neutral 700) | axe: 새 요소 0건. 남은 1건은 공용 `backLink`(리포트에도 같은 위반 — 리포트 15건 기준선). 처음 돌렸을 때 빈 사례 문구(`hint` 600, 옅은 면 4.26:1) · 페이지 설명 · 자산군 줄(500)이 걸려 고쳤다 |
| 가로 스크롤 | — | 1440 · 390(앱 웹뷰 UA `SALTApp/`) 둘 다 없음 |

## 실데이터 (임시 사용자)

성적표는 사용자별이 아니라 임시 사용자 토큰으로 실서버(4000) → BFF(4001, 이 브랜치로 재시작) → 화면(3100)을 확인했다.
그룹 3개(`long_term.wait` 3 · `scalp.avoid` 4 · `scalp.wait` 47)의 구간 합이 표본과 같다. 확인 뒤 삭제 — users 6 → 5 · `user_id` 열 전 테이블 남은 행 0.

## 검증 명령

BFF: `npm run build` · `npm test` 289. FE: `pnpm check-types` · `pnpm lint` · `pnpm test`(core 51 · ui 43) · `pnpm test:layer-check`(차단 8 · 통과 5) ·
Bash 로 쓴 15파일 layer-check 훅 사후 실행 0 · `web` · `web-tax` build. 서버 무변경.
번들(같은 날 main 워크트리 빌드 대비): `/coach/report` 1.59 → 1.65 kB · 첫 로드 130 → 130 kB · 새 `/coach/signals/[signalType]` 130 kB(본문은 리포트와 같은 `ssr:false` 위젯 청크).

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 국내 주식 그룹 화면 | 국내 그룹은 소유자에게만 온다 — 같은 컴포넌트 · 머리 자산군 줄만 다름. 임시 사용자 토큰엔 국내 그룹 0 | `QA-001` |
| 공용 `backLink` 대비 | 기존 스타일(리포트 · 상세 공용) | `@repo/ui` 대비 정리 REQ |
| RN push 화면 | 앱 미착수 | `RN-REQ-020`~`023` |
