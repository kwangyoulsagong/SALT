# 실행 이미지 — 빌드는 밖에서(`./gradlew :app:bootJar`). 같은 이미지를 로컬 Compose 와 관리형 컨테이너가 쓴다(`ADR-008`).
# CI 에서 이미지를 만드는 단계 · 레지스트리는 OPS-001.
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S salt && adduser -S salt -G salt
USER salt
WORKDIR /app
COPY app/build/libs/salt-platform.jar app.jar
EXPOSE 4010
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
