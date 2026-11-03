// 공유 커널 — Money · Quantity · ErrorKind · DomainError. **Spring · jOOQ · Jackson 의존 0**(이 파일에 의존이 없다는 것이 규칙이다).
// 도메인 개념을 올리지 않는다(`msa-services.md` §4) — 두 서비스가 같은 것을 원하면 한쪽이 주인이고 다른 쪽은 이벤트로 받는다.
plugins {
    id("salt.kotlin")
}
