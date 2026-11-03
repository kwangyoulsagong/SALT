// 도메인 — 공유 커널 외 의존 0. Spring · jOOQ 가 클래스패스에 없으니 import 하면 컴파일이 깨진다(`SRV-REQ-043` FR-2).
plugins {
    id("salt.kotlin")
}

dependencies {
    api(project(":shared-kernel"))
}
