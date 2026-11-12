# 구현 · done 체크리스트 — 되풀이된 결함을 다시 내지 않는다

근거 `DEV-001`(2026-11-04). 아래 항목은 전부 **한 번 이상 실제로 터졌다.** 규칙 문서에 적기만 한 것은 다시 터졌고,
코드가 막는 것(레이어 훅 · `axios` · zone 을 넘는 `<Link>`)은 다시 터진 적이 없다. 그래서 **기계로 셀 수 있는 것은 기계가 센다.**

> 코드 리뷰 스킬은 쓰지 않는다(사용자 2026-11-04). 결함이 리뷰에서 나오면 구현이 이미 틀린 것이다 —
> 구현 전에 막고, done 전에 기계 검사와 실화면으로 닫는다.

## 1. 기계가 막는 것

| 되풀이된 것 | 막는 것 | 언제 |
|---|---|---|
| 주인 REQ 의 스펙 Changelog · 체크리스트 · 회고 누락(10번 지적) | `node scripts/check-done.mjs` 1번 | done 전 |
| done 으로 옮긴 REQ 의 체크리스트 · 회고 없음 | 같은 스크립트 2번 | done 전 |
| 루트 슬라이스 3종 · 마스터 인덱스 누락 | 같은 스크립트 3 · 4번 | done 전 |
| `.claude/rules/**` 200줄 초과 | 같은 스크립트 5번 | done 전 |
| 참고한 외부 서비스 이름이 문서 · 커밋에 | 같은 스크립트 6번(목록은 `.git/info/reference-brands`, 레포에 없다) | done 전 |
| DB 오류 코드(`P2002`)로 흐름 가르기 | `salt-server` lint `no-restricted-syntax` | 저장 · `pnpm lint` |
| 행마다 DB 쓰기를 `Promise.all` 로 흩어 연결 풀을 다 잡음(장중 504 — 11-02 · 11-10) | `salt-server` `noParallelRowWrites.test.ts` | `npm test` |
| 렌더 중 토큰 · 지금 시각 · 난수 · 브라우저 저장소 읽기(수화 갈림) | 웹 lint `@repo/fsd/no-render-read` — 브라우저에서만 그려지는 자리는 이유를 적은 예외 주석 | 저장 · `pnpm lint` |
| 원본(토큰)과 생성물(아이콘)이 갈라짐 | `@repo/ui` `brandIcons.test.ts` | `pnpm test` |
| `viewTransitionName` 쌓임 맥락에 떠 있는 메뉴가 갇힘(머리 메뉴가 본문에 깔림) | `@repo/ui` `viewTransitionStacking.test.ts` — 그 블록에 `zIndex` | `pnpm test` |
| `"use client"` 파일의 enum 을 서버 컴포넌트가 읽어 `undefined`(때맞춘 팁 400, 2026-11-05) | 웹 lint `@repo/fsd/no-client-enum-export` | 저장 · `pnpm lint` |
| 봉 upsert 가 바뀌지 않은 행까지 다시 써 장중 DB 를 잡음(504 5회차, 2026-11-10) | `salt-server` `noBlindCandleRewrite.test.ts` — `price_history` `DO UPDATE` 는 `WHERE` 필수 | `npm test` |
| 소유자 판정이 전망 밖으로 번짐(국내 공개 뒤 남은 판정, 2026-11-10 `ADR-011`) | `salt-server` `ownerGateScope.test.ts` | `npm test` |
| 예측 작업 락이 트랜잭션을 열어 둔 채 DB 전체 VACUUM 을 막음(8시간, 2026-11-10) | `salt-forecast` `tests/store/test_advisory_lock.py` · `test_job_timeout.py` | `uv run pytest` |
| 인용이 가리키는 사실 id 에 회차 시각 — 장중 10분마다 ③ 이 사라짐(2026-11-12 F016 D) | `salt-server` `whyMoved.test.ts` 불변식(회차 · 값이 바뀌어도 같은 날 id 같음) | `npm test` |
| 같은 LLM 상한을 앞 배치가 다 써 뒤 배치 시도 0(2026-11-12) | `salt-server` `opsGuards.test.ts` 예약 경계 | `npm test` |
| 빨강(`danger`)이 되돌릴 수 있는 일에 붙음(로그아웃 빨간 메뉴, 2026-11-12) | 웹 lint `@repo/fsd/danger-only-irreversible` — 바로 위 주석에 되돌릴 수 없는 이유 | 저장 · `pnpm lint` |
| FSD 레이어 · 도메인 경계 · zone 을 넘는 `<Link>` · `axios` · `motion` import | 레이어 훅 · lint(기존) | 쓰기 시점 |

CI 는 두지 않는다(사용자 2026-11-04) — 영역 deliver 단계가 이 명령들을 부른다.
**스크립트가 실패하면 고치고 다시 돌린다. 통과해도 아래 2 · 3절은 사람 몫이다.**

## 2. 구현 전 — 사람이 본다

1. **같은 일을 하는 코드가 이미 있나** — 같은 목적지 링크 · 같은 계산 · 같은 컴포넌트를 grep 하고 그것을 쓴다.
   새로 짜면 기존 것이 가진 처리(prerender · 계측 · 대기 문구 끔 …)가 빠진다(2026-11-04 머리 로고)
2. **보여 줄 대상 · 임계 · 금액을 프론트에 정하지 않는다** — 서버 설정 → BFF 뷰모델 → 화면. "프론트만으로 된다"여도(2026-09-22 요약 띠).
   lint 로 못 막는다 — 이름으로 찾은 상수 25개가 전부 입력 길이 · 목록 개수 · 칸 높이였다(2026-11-04 조사, 위반 0)
3. **기존 UI 결정을 바꾸기 전에 `git log --oneline -- <파일>`** — 표 선택 보라 · 차트 색 · 일부러 둔 커스텀 값은
   사용자와 정한 것이다. 대비 수정은 새 요소에만(2026-09-21 · 09-30). **규칙 문턱 · 가중도 같다** — `git log -p` 로 그 값을
   남긴 커밋 본문을 본다(후보 문턱 70 은 일부러 남긴 값이었다 — "결함"으로 단정하고 사전등록, 2026-11-12)
4. **결함은 사례가 아니라 규칙으로 고친다** — 불변식 한 줄 → 허용 · 거절 경계 표 테스트 → 같은 원인 호출처 전부 grep →
   상태는 값과 한 덩어리 → 구현. 같은 종류가 두 번 나오면 멈추고 설계를 의심한다(2026-11-03 S1b 11회)
5. **규칙을 적은 자리와 실제로 쓰이는 자리를 같이 본다** — "16px 은 단색"을 ICO 에만 넣었는데 브라우저는 SVG 를 골랐다(2026-11-04)
6. 종목이 나오는 자리엔 종목 아이콘 · 다른 페이지로 가는 패널엔 오른쪽 셰브론(링크 폭 100%)

## 3. done 전 — 사람이 본다

1. `node scripts/check-done.mjs` 통과
2. **실화면 · 실데이터로 닫는다** — "계정 · 데이터 없음"은 미검증 사유가 아니다. 임시 사용자로 만들고 지운다 ·
   390 은 앱 웹뷰 UA 로 · 로딩 · 실패는 Playwright `route` 로(4번 지적)
3. **공용 함수를 바꾸면 소비처를 전부** — `grep -rl <함수>` 로 찾아 main 과 나란히(별도 `git worktree`)
4. **변이로 테스트를 확인할 때 `git checkout -- <파일>` 로 되돌리지 않는다** — scratchpad 사본으로
5. **범위 안 후속은 묻지 않고 끝낸다** — "결정 대기"는 제품 방향 · 약관 · 비용처럼 정할 수 없는 것만
6. 영역 검증 전체(`pnpm check-types` · `lint` · `test` · 바뀐 zone 빌드 · `@repo/ui` 면 `build-storybook` · BFF `npm run build`) ·
   Bash 로 쓴 파일은 레이어 훅 사후 실행

## 4. 항목을 더하는 법

새로 터진 결함은 먼저 **기계로 셀 수 있는지** 본다 — 셀 수 있으면 lint · 테스트 · `check-done.mjs` 에 넣고 1절 표에 행.
셀 수 없을 때만 2 · 3절에 한 줄(무엇이 · 언제 터졌나). 사례 설명을 길게 적지 않는다.
