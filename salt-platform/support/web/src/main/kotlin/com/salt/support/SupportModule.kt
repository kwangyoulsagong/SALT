package com.salt.support

import org.springframework.modulith.ApplicationModule
import org.springframework.modulith.PackageInfo

/**
 * `support` = 서비스가 같이 쓰는 기술 부품(HTTP · DB · 이벤트). 도메인 개념은 없다 — 그건 `shared-kernel` 에도 올리지 않는다.
 * Modulith 에서 열린 모듈(OPEN)이다: 하위 패키지(web · persistence · messaging)를 서비스가 import 한다.
 * 서비스끼리는 닫혀 있다 — 열린 건 여기뿐(`msa-services.md` §4).
 *
 * 클래스에 붙인다 — Kotlin 은 선언 없는 파일에 파일 클래스를 만들지 않아 `@file:` 어노테이션이 사라진다.
 */
@PackageInfo
@ApplicationModule(type = ApplicationModule.Type.OPEN)
class SupportModule
