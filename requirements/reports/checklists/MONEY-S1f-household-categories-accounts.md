# 체크리스트 — 가계부 S1f + F4f(내 분류 · 통장 쪼개기)

슬라이스 `requirements/specs/done/MONEY-S1f-household-categories-accounts-slice.md` · 커밋 `96c7c5b4`(서버 · DB V6 · 이벤트 계약) · `d6085b85`(BFF) · `3269eef3`(FE).
영역 체크리스트: `salt-server/…/SRV-REQ-046.md` · `DB-REQ-038.md` · `SRV-REQ-044.md` · `bff/…/BFF-REQ-048.md` · `salt-microFe/…/FE-REQ-057.md` · `FE-REQ-009.md` · `FE-REQ-013.md` · `RN-REQ-034.md`(변경 없음).

## 1. 판단 1~6 → 구현

| 판단 | 확인 |
|---|---|
| 1 분류 표를 건드리는 둘 | V6 = 새 표 하나(`custom_category`) + 방식 CHECK 교체 둘(`budget` · `month_close`). 지출 원장 열 변경 0 |
| 2 같은 열 · 난수 키 · 보관 | 도메인 경계 표 — 키 읽기 9칸(대문자 · 11 · 13자리 · 다른 접두 · 빈 값 거절) · 이름 1~12자 · 공백 정리 · 제어 문자. 종단 — 만들어 적기 · 이벤트 본문은 키만(이름 0) · 묶음 바꾸면 이번 달 `wants` 봉투로 옮김 · 보관 뒤 새로 적기 · 새 봉투 400 · 지난 지출 키 · `archived` 표시 · 다시 보관 404 · 같은 이름 다시 만들기(새 키) · 남의 키로 적기 400 · 기본 분류 지우기 404 |
| 3 통장 쪼개기 | 도메인 — 급여 몫 = 소득 − 셋 · 딱 소득이면 0 · 1원 넘으면 `BUDGET_SPLIT_OVER_INCOME` · 0 이면 빈 칸 · 입력 방식 4종 → 급여/생활비 · 생활비 넘침은 음수일 뿐 · 봉투 밖 0. 종단 — 템플릿 확인 → `salary` 남은 500,000 · 직접 → `spending` −100,000 · 월 화면 봉투 둘 · `unbudgeted` 0 · 지난 달 닫으면 `account_split` 사본 · 마감 CHECK |
| 4 분류 표 한 곳 · 한 문장 넣기 | `CategoryBook`(묶음 · 고를 수 있나 · 순서 표 테스트) · 상한 종단 — 20개 · 21번째 409 `CATEGORY_TOO_MANY` · 보관하면 자리 · 같은 이름 409 `CATEGORY_NAME_TAKEN` |
| 5 쿼리 수 | 종단 — 월 22 · 저장 11/10(기본 분류 · 봉투) · 홈 6 그대로 |
| 6 화면 이름 한 곳 | 서버 HTML 에 "강아지" 있음 · "내 분류"(대체 글) 없음 · "급여 통장(고정비)" 있음 · 칩 기본 12 + 내 분류 · 내역 줄 "11월 5일 · 강아지" |

## 2. 검증

| 항목 | 결과 |
|---|---|
| 서버 `./gradlew check` | 통과 — 도메인 +8(`CategoryAccountSpec`) · 종단 +3(29) · Modulith · ArchUnit |
| 실행 jar | `bootJar` → launchd 재기동 · Flyway household 5 → 6 · health UP. 슬라이스 경로 주석을 고치느라 로컬 V6 를 한 번 되돌리고 다시 적용(push 전 — 체크섬 일치) |
| Swagger | `/api/household/categories` · `/categories/{key}` · `CategoryView`(name · custom · archived) · `CategoriesView` · `BudgetView.salaryShare` · `MonthPageView.categories` |
| BFF | `npm run build` · 367/367(+1) |
| 프론트 | `check-types` · `lint` 12/12 · `test`(core 169 · ui 44) · `test:layer-check` 26 · 가계부 zone 운영 빌드 · 훅 사후 실행(Bash 로 쓴 파일 전부) 차단 0 |
| 실스택(임시 사용자 — 뒤에 삭제 · 트리거 다시 켬 · 남은 행 0) | BFF 경유 분류 만들기 · `account_split` 저장(급여 몫 1,100,000) · 템플릿 확인 → 급여 통장 · 내 분류 지출 → 생활비 통장 |
| 실화면 | 4폭(1024 · 1280 · 1440 · 1600) × 3화면(`/household` · `/budget` · `/new`) 넘침 0 · 앱 웹뷰 390 × 2화면 넘침 0 · 봉투 "급여 통장(고정비) 남은 돈 500,000원 · 생활비 통장" · 예산 화면 같은 이름 → "같은 이름의 분류가 있어요" · 만들기 · 고치기("OTT 구독" → "영상 구독") · 지우기 결과 줄 · 저축 통장 고쳐 저장 → 급여 몫 900,000원(서버 값) · 봉투 방식 칸에 내 분류 둘(지운 것 0) |
| EXPLAIN | 월 합(템플릿 묶음 더함) `expense_user_day_idx` 0.084ms · 분류 표 `custom_category_user_id_category_key` 0.014ms — 행 2만 · 2천 넣고 롤백 |
| 번들 | `/household` 162 → 163 kB · `/household/budget` 134 kB · 공용 103 kB |
| `node scripts/check-done.mjs` | 통과(deliver 뒤) |

## 3. 확인 단계에서 고친 것

- 월 합 쿼리 500 — 템플릿 여부 식의 상수가 바인드 변수라 SELECT · GROUP BY 식이 달랐다(종단 22건 실패로 발견 → `inline`, `96c7c5b4` 안)
- 내 분류 패널이 가득 찬 폭이라 줄 끝 버튼이 화면 끝으로 밀림 — 1280 실화면에서 발견, 편집기와 같은 640 으로(`3269eef3` 안)
- 파일 단위 `prettier` 를 잘못 돌려 손대지 않은 엔티티 6개가 다시 감싸졌다 — 커밋 전 되돌림(이 레포는 prettier 설정이 없다)

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 사람 장부 · 이야기 카드 · 리볼빙 | 범위 밖(판단 1) | 가계부 S1g |
| 내 분류 상한의 동시 요청 | 느슨한 상한(판단 4) — 불변식이 아니라 확인하지 않는다 | 바꿀 일 없음 |
| RN 내 분류 · 통장 쪼개기 | 웹 계약 확정 뒤 | `RN-REQ-034` |
