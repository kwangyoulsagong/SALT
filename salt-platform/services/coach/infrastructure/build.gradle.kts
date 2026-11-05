// coach 발행 창구(서버 S2c — `SRV-REQ-048` FR-5). S6 전까지 코드 0 · Flyway 스크립트(아웃박스 표)만 — 행은 Express coach 가 쓰고
// 릴레이는 support/messaging(`OutboxRelay`)이 svc_coach 로 돈다. 꽂는 곳은 app 의 CoachComposition. S6(`SRV-REQ-049` FR-4) 에 네 층으로 자란다.
plugins {
    id("salt.kotlin")
}
