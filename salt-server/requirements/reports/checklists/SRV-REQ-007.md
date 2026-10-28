# SRV-REQ-007 (서버 정리 — 삭제 · 동면) — 검증 체크리스트

- REQ: `requirements/specs/in-progress/SRV-REQ-007-ARCH-CLEANUP.md`
- 브랜치: `chore/adr-002-remnants` (`d344a50`) · 검증일: 2026-10-27
- 상태: **부분 완료** — 동면 FR-10 · 12 · 13 · 14 가 닫혔다. 삭제 FR-1 · 2 · 5 · 알림 FR-11 이 남았다
- **전 영역 통합 기록**: 루트 `requirements/reports/checklists/F000-dormant-410.md`

## 1. 동면 (FR-10~14)

| FR | 내용 | 결과 | 근거 |
|---|---|---|---|
| FR-10 | 미션 · 포인트 · 업적 route 해제, 코드 · 모델 유지 | **pass** | `app.ts` 에서 `/api/missions` 등록 제거. `/api/users/points` · `/achievements` · `/dashboard` 는 `user.routes` 안이라 라우터 앞 410 으로 가림. `modules/mission/**` 4파일 · Prisma 4모델 그대로 |
| FR-11 | 알림 파이프라인 축소 | 미착수 | 범위 밖 — `notification` 컨텍스트 |
| FR-12 | 인사이트 랭킹 · 피드 해제 | **pass** | `/api/feed` 등록 제거 · `/api/investment-insight/top` 410. `/insights` 등 같은 라우터 경로 유지(401 실측) |
| FR-13 | 대시보드 해제 | **pass** | `/api/dashboard` 등록 제거. BFF 홈은 더 이상 부르지 않는다(`BFF-REQ-007` B절) |
| FR-14 | 410 + 1회 로그, 1주 유지 | **pass** · 1주 **대기** | 스크래치 서버 8경로 410 · 로그 7줄/7곳. 1주 잔여 0건은 2026-11-03 |

## 2. 되살리기 테스트 (수용 기준)

| 시도 | 결과 |
|---|---|
| `/api/missions` 를 목록에서 빼고 `mission.routes` 재등록 | **200** `{missions: [], pagination}` (소유자 토큰) · 다른 동면 경로는 410 그대로 · 되돌림(스크래치 사본이라 원본 무변경) |
| `/api/dashboard` 같은 방식 | **500** `DASHBOARD_FETCH_FAILED` — 라우터가 묶이지 않은 메서드를 넘겨 `this.service` 가 없다. **동면 전부터** 언제나 500(`feed` · `insight-ranking` 도 같은 모양). Open Questions 에 기록 |

## 3. 명령

`npm run build` · `npm run lint` · `npm test` 820 · `npm run test:layer-check` · 훅 사후 실행 4파일 exit 0. 원장 3종 · 스키마 무변경(마이그레이션 없음).

## 4. 미검증 · 범위 밖

| 항목 | 사유 | 언제 닫히나 |
|---|---|---|
| 1주 로그 잔여 0건 | 시간 게이트 | 2026-11-03 |
| 삭제 FR-1(레거시 모델) · FR-2(중복 워커) · FR-5(README) | 이번 범위 밖 — 마이그레이션 · BFF 워커 결정 필요 | 별도 슬라이스 |
| ~~FR-11 알림 축소~~ | **닫힘 2026-10-28** — 아래 | ~~F006 알림~~ |
| 동면 컨트롤러 `this` 결함 | 동면 코드 | 되살리는 PR |
| Prisma 모델 `\dt` 실측 | 스키마 무변경이라 `schema.prisma` 4모델 grep 으로만 | 삭제 FR-1 착수 시 |

## FR-11 알림 1종 (2026-10-28)

루트 `F000-notification-kind-gate` · `3320883`. 확인은 `SRV-REQ-008.md` 같은 날 절. 동면 `feed.service` 타입 수정은 410 뒤라 실행 경로 없음 — `build` 로만. 미검증: 없음
