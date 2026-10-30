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
| FR-11 | 이전 기간 — S7 전까지 맥 launchd 서버는 BFF 스위치 `legacy` 대상으로 남는다(관리형 환경에서 맥으로 사설 연결 또는 스테이징 한정). 방식은 FR-3 뒤 확정 | S1~S6 |

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
