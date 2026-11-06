// 들어오는 어댑터 — HTTP 컨트롤러 · 이벤트 구독(저축 · 가계부 · 코치) · 만료 정리 워커. 유스케이스만 부른다(infrastructure 를 모른다).
plugins {
    id("salt.spring")
}

dependencies {
    implementation(project(":services:notification:application"))
    implementation(project(":support:web"))
    implementation(project(":support:messaging"))
    implementation(libs.springdoc.webmvc)
}
