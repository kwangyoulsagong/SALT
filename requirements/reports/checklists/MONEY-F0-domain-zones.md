# 돈 관리 앱 F0 — zone = 도메인 — 체크리스트

슬라이스: `requirements/specs/done/MONEY-F0-domain-zones-slice.md` · 2026-11-02
브랜치: `feat/fe-req-052-domain-zones` (base `main` `fba1f42a`)
영역 체크리스트: `salt-microFe/requirements/reports/checklists/FE-REQ-052.md`(본체) · `FE-REQ-007.md` · `FE-REQ-008.md` · `FE-REQ-009.md` · `FE-REQ-035.md` · `FE-REQ-044.md`

## 1. 확인 (실행한 것만)

| 확인 | 결과 |
|---|---|
| 모노레포 `pnpm lint` · `check-types` · `test` | 8/8 · 8/8 · core 62 · ui 43 |
| `pnpm build` | 5/5(셸 + 도메인 zone 4 단독 빌드) |
| `pnpm test:layer-check` | 차단 12 · 통과 7 |
| 셸 번들(main 워크트리 빌드 대조) | 공용 105 → 105 kB · `/search` +0.3 kB · `/onboarding` 첫 로드 +1 kB · 나머지 0 |
| ESLint 변이(stdin) | cross-zone `<Link>` 실패 3 · 옮기기 전 투자 `<Link>` 통과 · `shell-domain` · `foreign-domain` · `thin-zone` 실패 |
| 실기동 rewrites | `/goals` · `/household` · `/tips` · `/coach` → 각 zone(`data-zone`) · 셸 화면 4경로 셸 200 · zone 자산 200 |
| 훅 사후 실행 | Python 으로 쓴 레이아웃 4 exit 0 |

## 2. 짝 영역 — 변경 없음

| 영역 | 왜 |
|---|---|
| BFF · 서버 · DB · 예측 | 요청 계약 무변경 — 프록시는 프론트 셸 안 |
| RN(`RN-REQ-032`) | 번들 이름 = 레지스트리 `domain` — 문서와 같다 |
| `ops/salt.sh` | 셸만 기동 — zone 은 빈 골격 |

## 3. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| `domain-*` 안 레이어 축 · 도메인 간 import 의 ESLint 경로 | 패키지 없음(훅으로만 확인) | `FE-REQ-053` FR-1 |
| zone 앱 기동 운영 · 한 origin 라우팅 | 빈 골격 · 배포 미착수 | `FE-REQ-053` · `OPS-001` |
| 셸 ↔ 도메인 전환 실측 | 옮긴 화면이 없다 | `FE-REQ-053` FR-6 · `FE-REQ-054` FR-6 |
