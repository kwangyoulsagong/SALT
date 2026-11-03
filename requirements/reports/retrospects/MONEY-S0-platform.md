# 돈 관리 앱 S0 — Kotlin 플랫폼 — 회고

영역 회고: `salt-server/requirements/reports/retrospects/{SRV-REQ-043,SRV-REQ-044,DB-REQ-036}.md` · `bff/requirements/reports/retrospects/BFF-REQ-045.md`

## 요약

- 기능 0 슬라이스라 합격선을 "빈 서비스가 실제 길을 지나간다"로 잡았고, 테스트 · Compose · BFF · Jaeger 네 겹으로 같은 추적 ID 를 봤다
- **같은 날 쓴 두 REQ 가 서로 막았다**(Modulith 발행 기록 ↔ 서비스별 계정). 착수 전 네 질문(`msa-services.md` §1)으로 잡았다
- **테스트가 못 잡은 결함 셋을 실행이 잡았다** — 실행 jar `kotlin-reflect` 누락(Compose) · BFF 빌드가 전역 tsc 에 기댐(이미지 빌드) · 빈 문자열 설정이 내보내기를 켬(기동)
- 독립 리뷰(high) 10건이 전부 사실이었다 — 특히 "토큰 없는 없는 경로 401"은 골든을 토큰 없이 녹화하고 테스트는 토큰을 넣어 가려져 있었다. **골든 비교는 녹화와 같은 조건으로 요청한다**
- 로컬 운영 DB 적용은 권한 확인에서 막혔다 — 우회하지 않고 사전 확인 · 왕복 테스트 · 실행 명령을 남겼고, 사용자 허락("너가 다해줘") 뒤 백업 → 적용 → 영향 확인 순서로 했다

## Action

- 새 모듈 · 새 이미지는 "테스트 통과" 다음에 **실행 산출물로 한 번 띄운다**(jar · 이미지)
- 골든 테스트는 녹화 요청과 헤더까지 같게
- done 으로 옮기기 전 리뷰(high) — 이번엔 in-progress 단계에서 돌려 문서 커밋 전에 고쳤다
