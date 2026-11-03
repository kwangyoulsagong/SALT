// HTTP 공통 — 응답 envelope · 오류 바디 · JWT 검증. **모양은 Express 와 같다**(`SRV-REQ-043` FR-6 · 7, 골든은 app 테스트).
plugins {
    id("salt.spring")
}

dependencies {
    api(project(":shared-kernel"))
    api("org.springframework.boot:spring-boot-starter-webmvc")
    api("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
    api("org.springframework.boot:spring-boot-starter-validation")
    api("org.springframework.modulith:spring-modulith-api")
}
