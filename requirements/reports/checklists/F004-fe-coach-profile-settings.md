# F004 슬라이스 18 — 설정 화면 체크리스트

| 요구 | 구현 | 확인 |
|---|---|---|
| 진입 | `features/sign-out` `ProfileMenu` "설정" → `ROUTES.settings` | 홈에서 메뉴 → `/settings` 이동(실화면) |
| `FE-REQ-026` FR-80(개정) | `features/edit-coach-profile` `CoachProfileForm` · `widgets/settings-panel` | 기본 모드 세그먼트 · 기간 칸 · 매입가 토글 · 내 기준 링크(셰브론) |
| 바꾼 칸만 저장 | `onSubmit` 비교 기준 = 지금 캐시 | PATCH 본문 `{"defaultMode":"long_term","panicSellWindowHours":48}` |
| 입력 검증 | `toWindowHours` 1~168 정수 | `500` → 오류 문구 · PATCH 0건. 서버 직접 PATCH 500 → 400 |
| 새로고침 뒤 유지 | 서버 저장 | 장기 · 48 유지 |
| FR-81 기본 모드 효과 | 서버 `GetSymbolCoach` `profile.defaultMode` | 저장 뒤 `/investments/BTC`(모드 없음) → 장기 선택 |
| FR-82 재조회 | `symbolAll` · `report` 무효화 | 코드 · 위 행 |
| 토글이 다른 칸을 비우지 않음 | `toCoachProfileSettings` · 낙관적 갱신은 캐시 있을 때만 | 토글 뒤 장기 · 48 그대로 · 새로고침 뒤 토글 켜짐 |
| 조회 실패 | route GET 500 | "설정을 불러오지 못했어요" · 토글 자리 "설정을 불러오지 못해 지금은 바꿀 수 없어요" |
| 저장 실패 | route PATCH 500 | "지금은 저장하지 못했어요. 입력은 그대로 있어요" · 입력 72 유지 |
| 모르는 값 | route `defaultMode: "weird"` | 그 칸만 "불러오지 못했어요" · 세그먼트 0 · 기간 칸은 그대로 |
| 로그아웃 | 토큰 없음 | "로그인하면 설정을 볼 수 있어요" |
| 접근성 | 세그먼트 `radiogroup` 이름 · 기간 `label` | axe 1440 · 390(앱 웹뷰 UA): 새 요소 0. 남은 3건 기존 공용(`panelDescription` 3.03 · 세그먼트 미선택 4.18 · 토글 설명 3.03) — `/search` 기준선 3건 |
| 폭 | 좁으면 라벨 위 · 칸 아래 | 1280 · 1024 · 390 가로 스크롤 0. 390 에서 설명 · 링크 줄이 단어 중간에서 꺾여 `keep-all`(`3710bb79`) |
| 금지 문구 | 메시지 grep | 확신 표현 · 명령형 · 인격 평가 0("공포" 이름 미사용) |

## 실데이터 (임시 사용자)

임시 사용자 토큰으로 실서버(4000) → BFF(4001) → 화면(3100, 빌드본)을 확인했다. BFF 응답 6필드 + 숨김 · `supportedModes`.
확인 뒤 두 번 모두 삭제 — users 6 → 5 · 그 사용자 프로필 행 삭제 · 남은 행 0.

## 검증 명령

| 명령 | 결과 |
|---|---|
| `pnpm check-types` | 5/5 |
| `pnpm lint` | 5/5 (경고 0) |
| `pnpm test` | core 51 · ui 43 통과 |
| `pnpm test:layer-check` | 차단 8 · 통과 5 |
| 훅 사후 실행(셸로 쓴 파일) | 38파일 + 수정 2파일 exit 0 |
| `pnpm build`(web · web-tax) | 통과 · `/settings` 1.79 kB · 첫 로드 130 kB(`/coach/report` 130 kB) |
| 수정 커밋 뒤 재검증 | `pnpm build` · `test` · `check-types` · `lint` · `test:layer-check` 전부 다시 통과 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 서버가 읽지 않는 3필드 칸 | 사용자 결정 — 칸을 두지 않음 | 서버 소비처가 생길 때(`SRV-REQ-025`) |
| RN 설정 화면 | 앱 미착수 | `RN-REQ-020` FR-70 |
| 공용 스타일 대비 3건 | 기존 공용 스타일 | `@repo/ui` 대비 정리 REQ |
| 소유자 실계정 화면 | 이 화면은 사용자별 설정만이라 임시 사용자로 같은 경로를 확인했다 | `QA-001`(전체 로그인 QA 에 포함) |
