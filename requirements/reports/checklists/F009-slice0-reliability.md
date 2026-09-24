# F009 슬라이스 0 — 신뢰성 수정 — 체크리스트

슬라이스: `requirements/specs/in-progress/F009-slice0-reliability-slice.md`
브랜치: `feat/f009-slice0-reliability` (base `main` `8e1462a`)

## C04 — `worstObservedReturn` (2026-09-24)

영역: `salt-server/.../checklists/SRV-REQ-025.md` §10 · `SRV-REQ-024.md` §6 · `bff/.../BFF-REQ-024.md` §3 · `salt-microFe/.../FE-REQ-026.md` §8

| 확인 | 결과 |
|---|---|
| 코드 · 진행 중 스펙에 `maxDrawdown` | **0건**(done/ REQ 와 변경 이력은 역사라 그대로) |
| 웹 소스에 "최대 낙폭" | **0건**. `FE-REQ-030` FR-101 "기간 최대 낙폭"은 평가금 곡선의 진짜 MDD 라 그대로 |
| 서버 | `npm run build` · `npm test` **349 / 0** · `eslint .` |
| BFF | `npm run build` · `npm test` **121 / 0** |
| 프론트 | `pnpm check-types` · `lint` · `test` · `build`(web · web-tax) 성공 · `layer-check` 3파일 exit 0 |

## C05 — 기간 = 채점 기간 (2026-09-24)

영역: `SRV-REQ-025.md` §11 · `SRV-REQ-024.md` §7 · `BFF-REQ-024.md` §4 · `FE-REQ-026.md` §9

| 확인 | 결과 |
|---|---|
| 서버 `src` 에 "25분" · `5m-24h` · `1w-1y` · `5m_24h` · `1w_1y` | **0건** — 전부 `COACH_HORIZON` |
| LLM 이 다른 기간을 쓸 때 | 버리고 "판단 뒤 24시간" 주입(테스트) |
| 채점 기간 | 24시간 · 30일 불변 — 기존 표본 유효 |
| 서버 | build · test **353 / 0** · eslint · layer-check |
| BFF | build · test **121 / 0**(픽스처만) |
| 프론트 | check-types · lint · test · build(web · web-tax) · layer-check |

## C06 — 표본 출처 (2026-09-24)

영역: `DB-REQ-017.md` C06 절 · `SRV-REQ-024.md` §8

| 확인 | 결과 |
|---|---|
| 마이그레이션 · 백필 | 256행 → `synthetic` 240 · `live` 16, 행 수 불변 · CHECK 가 모르는 값 거부 |
| 성적(실DB) | 기본 `live`: 그룹 1 · 표본 8 / 합성 포함: 그룹 8 · 표본 248 |
| 운영 가드 | `production` + 합성 집계 → 기동 거부(코드) |
| 서버 | build · test **353 / 0** · eslint · layer-check · `prisma validate` · `migrate status` |
| BFF · 프론트 | 계약 변경 없음 — 돌리지 않았다 |

## C02 — 해설 캐시 키 (2026-09-24)

영역: `SRV-REQ-025.md` §12

| 확인 | 결과 |
|---|---|
| 가격 200 · 1,000 · 1억 · 2억 | 옛 키 넷 다 같음 → 새 키 **4개** |
| 근거 · 뉴스 요약 · 출처 · 모드 · 모델 | 하나만 바뀌어도 다른 키 |
| 서버 | build · test **356 / 0** · eslint · layer-check |
| BFF · 프론트 | 계약 변경 없음 — 돌리지 않았다 |

## 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 인증된 HTTP 응답 실측 | 이번 세션에서 로그인 토큰을 만들 수 없었다 — 단위 · 뷰모델 테스트로만 확인 | 사용자 로그인 화면 QA |
| 판단이 열린 코치 카드 라벨 · 유효시간 문구 | 로그인 + 표본 20 필요 | 같은 QA |
| 25분 단타 전략 | 사용자 결정으로 만들지 않는다 | 범위 밖(결정) |
| C03 · C01 | 이 슬라이스의 다음 항목 | 이 브랜치 |
| 해설 LLM 호출 수 변화 | 키가 정확해져 늘 수 있다 — 안 셌다 | 관측성 계측 |
| 운영 DB 시드 행 유무 · `backtest` 출처 | 운영 DB 미접근 · 쓰는 곳 없음 | 운영 배포 · F008 P2 |
