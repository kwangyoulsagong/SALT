# SRV-REQ-043 회고 (2026-11-03, S0)

- **실행 jar 결함을 테스트가 못 잡았다.** `kotlin-reflect` 가 Kotest 를 통해 테스트 클래스패스에만 있어 18/18 통과 뒤 Compose 기동에서 처음 깨졌다. 테스트 통과 ≠ 기동 — `kotlin-platform.md` §7 에 "실행 jar 로 한 번 띄운다"를 넣었다.
- 버전은 짐작하지 않고 Maven Central 메타데이터 · Boot BOM pom 으로 정했다. json-schema-validator 3.0.8 이 Jackson 3.2.1 을 끌어와 Boot 의 3.1.7 을 조용히 덮은 것을 `dependencies` 의 `->` 로 찾았다 — 라이브러리를 더할 때 그 출력을 본다.
- 툴체인만 21 로는 부족했다(jOOQ 3.21 코드 생성 플러그인이 **데몬** JVM 21 을 요구). `gradle-daemon-jvm.properties` 를 처음부터 둔다.
- 설계에서 바뀐 셋(Money value class → 불변 클래스 · sealed → abstract · Clock 포트 → `java.time.Clock`)은 언어 제약이 정했다. REQ 문장을 그 자리에서 정정하고 규칙도 같은 커밋에서 고쳤다.
- Kotlin 파일 어노테이션(`@file:`)은 선언 없는 파일에서 사라진다 — Modulith OPEN 표시가 먹지 않아 `verify()` 가 깨졌다. 클래스에 붙인다.
- 빈 문자열 기본값(`endpoint: ${X:}`)이 "꺼짐"이 아니라 "빈 주소로 켬"이 되어 기동이 깨졌다. 켜고 끄는 설정은 빈 값 대신 키를 아예 두지 않는다.

## Action

- 새 서비스 모듈을 만들면 `./gradlew check` 다음에 bootJar + Compose 기동까지
- Resilience4j 설정 · 테스트는 첫 외부 호출(S5)과 같이 — FR-8 남은 줄

## 2026-11-03 — 리뷰 뒤

- 골든 404 를 토큰 없이 녹화하고 테스트는 토큰을 넣어 "토큰 없는 없는 경로 401" 차이가 가려졌다. 골든 비교는 녹화 조건 그대로 요청한다
- `ErrorResponse` 는 인터페이스라 `@ExceptionHandler` 대상이 못 된다 — 4xx 가 catch-all 로 500 이 됐다. 프레임워크 예외 계열을 처음부터 표로 대조한다
