// 들어오는 어댑터 — HTTP 컨트롤러. 유스케이스만 부른다(infrastructure 를 모른다).
plugins {
    id("salt.spring")
}

dependencies {
    implementation(project(":services:identity:application"))
    implementation(project(":support:web"))
    implementation(libs.springdoc.webmvc)
}
