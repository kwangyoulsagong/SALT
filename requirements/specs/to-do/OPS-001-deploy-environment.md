---
id: OPS-001
title: "배포 환경 구축 — 이미지 · 관리형 실행 · 한 origin 라우팅 · DB · 브로커 · CI/CD · 관측"
priority: high
labels: [ops, deploy, architecture, fe, bff, server, forecast]
created: 2026-10-30
source: requirements/decisions/ADR-008-deployment-environment.md
---

## Summary

`ADR-008` 실행 계획. 웹 F1(투자 zone 분리) 배포와 서버 S0 가 이걸 필요로 한다. 영역을 넘으므로 루트에 둔다.

## Requirements

| FR | 내용 | 막는 것 |
|---|---|---|
| FR-1 | Dockerfile — zone 5(Next standalone) · BFF · platform · market-ingest · forecast. 비루트 사용자 · 다단계 빌드 · 이미지 크기 기록 | 전부 |
| FR-2 | `docker-compose.yml`(local) — 전체 또는 셸 + 작업 중 zone(나머지 스텁) 프로필 | FE-052 Open Question |
| FR-3 | 공급자 선택 — 서울 리전 · 관리형 컨테이너 · Postgres(PITR) · RabbitMQ · 비밀 저장소 · CDN · L7 LB 경로 라우팅을 모두 주는 곳. 비교표 · 월 예상 비용 | FR-4~ |
| FR-4 | 인프라 코드 — 환경 2개(staging · prod) 를 코드로. 수동 콘솔 변경 0 | — |
| FR-5 | 진입 라우팅 — zone 레지스트리에서 LB 경로 규칙 생성(손으로 쓰지 않는다, `FE-REQ-052` FR-3 와 같은 원천) | F1 |
| FR-6 | DB 이전 — 맥 Postgres → 관리형. 덤프 · 복원 리허설 1회 · 행 수 대조 · 판정 원장 불변 트리거 확인 | S0 |
| FR-7 | CI/CD — 영향 그래프 빌드 · 레지스트리 · staging 자동 · prod 승인 · 되돌리기 명령 하나 | — |
| FR-8 | 비밀 — KIS · DART · LLM · JWKS. 로그 마스킹 규칙 유지 | — |
| FR-9 | 관측 · 경보 — 5xx · 수집 멈춤(마지막 봉 시각) · 데드레터 · 백업 실패 · 비용 상한 | — |
| FR-10 | 백업 복구 리허설 — 분기 1회 PITR 복원 시간 기록 | — |
| FR-12 | **zone 정적 파일 한 저장소**(2026-11-03 `ADR-005` 규칙 7 개정) — 운영 빌드는 모든 zone 이 공용 `/_next/static`. 배포가 zone 5 의 `.next/static` 을 한 CDN 경로에 합친다 — 같은 이름 · 다른 내용이면 배포 실패(`salt-microFe/scripts/merge-zone-static.mjs` 와 같은 규칙, CI 에서 그 스크립트를 `--check` 로). 이전 버전 파일은 한동안 남긴다(열린 탭이 옛 청크를 부른다). L7 은 `/_next/static/*` 를 이 저장소로, 페이지 경로는 zone 으로 | F2 캐시 공유 |
| FR-11 | 이전 기간 — S7 전까지 맥 launchd 서버는 BFF 스위치 `legacy` 대상으로 남는다(관리형 환경에서 맥으로 사설 연결 또는 스테이징 한정). 방식은 FR-3 뒤 확정 | S1~S6 |
| FR-13 | **세션 경로 라우팅**(2026-11-05 `FE-REQ-013` FR-80 2단계) — L7 은 `/api/session` · `/api/session/*` 를 셸 zone 으로, 그 밖 `/api/*` 를 BFF 로(긴 접두가 먼저). 셸 env `BFF_INTERNAL_URL`(갱신 Route Handler · 서버 컴포넌트가 부르는 BFF 내부 주소) · BFF env `WEB_ORIGINS`(쿠키를 토큰으로 받을 웹 origin — 운영 한 origin). 로컬은 셸 rewrites 가 같은 규칙 | F000 쿠키 세션 |
| FR-14 | **Express → `coach.outbox` 쓰기 권한**(2026-11-06 서버 S2c) — 로컬은 Express 가 DB 소유자(슈퍼유저)라 svc_coach 의 표에 쓴다. 관리형 Postgres 관리자는 슈퍼유저가 아니어서 Flyway(svc_coach)가 만든 `coach.outbox` 에 권한이 없다 → 배포 전 `GRANT USAGE ON SCHEMA coach` · `GRANT INSERT ON coach.outbox` 를 Express 계정에(롤 이름이 정해지면 `roles.sql`). 실패해도 코치 추천은 나가고 투자 알림만 빠진다(경고 로그) — S6 에 coach 가 Kotlin 으로 오면 이 권한은 지운다 | S2c |

## Acceptance Criteria

- [ ] staging 에서 zone 5 · BFF · platform 기동, 탭 이동 prerender 확인(같은 origin)
- [ ] prod 되돌리기 1회 실행 · 시간 기록
- [ ] PITR 복원 리허설 1회
- [ ] 월 비용 기록

## Notes

- 이 문서는 문서 단계 — 실행 전 미검증 전부.

## Changelog

| 날짜 | 변경 |
|---|---|
| 2026-10-30 | 신규(to-do) |
| 2026-11-03 | FR-12 추가 — zone 정적 파일 한 저장소(`FE-REQ-054` FR-5, `ADR-005` 규칙 7 개정) |
| 2026-11-06 | FR-14 추가 — Express 의 `coach.outbox` 쓰기 권한(관리형 DB 는 슈퍼유저가 아니다). 루트 `requirements/specs/done/MONEY-S2c-notification-slice.md` |

- 2026-11-02: 배포 전 로컬 감독은 `OPS-002`(`ops/salt.sh`, launchd). 배포 때 프로세스 목록(서버 · 뉴스 워커 · BFF REST · WS · 시세 워커 · 예측 배치)은 그 이름 표를 옮긴다
| 2026-11-03 | MONEY-S1a — `8d05a006` — `ops/salt.sh` 머리가 이 REQ(배포)를 가리킨다: 로컬 상시 목록에 `platform` · `web-savings` 추가. 배포 쪽 변경 0 — Kotlin 이미지는 S0 `Dockerfile` 그대로 |
| 2026-11-05 | FR-13 추가 — 세션 경로 라우팅 · `BFF_INTERNAL_URL` · `WEB_ORIGINS`(`FE-REQ-013` FR-80 2단계, 루트 `requirements/specs/done/F000-cookie-session-slice.md`) |
