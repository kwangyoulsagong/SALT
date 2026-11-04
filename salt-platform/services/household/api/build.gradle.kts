// 들어오는 어댑터 — HTTP 컨트롤러 · 이벤트 구독. 유스케이스만 부른다(infrastructure 를 모른다).
plugins {
    id("salt.spring")
}

dependencies {
    implementation(project(":services:household:application"))
    implementation(project(":support:web"))
    implementation(project(":support:messaging"))
    implementation(libs.springdoc.webmvc)
}
