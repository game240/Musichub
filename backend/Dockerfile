# 1. Build Stage
FROM eclipse-temurin:21-jdk-alpine AS builder
WORKDIR /app

# Gradle 래퍼 및 설정 파일 복사
COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle

# 종속성 사전 다운로드 (빌드 캐싱 최적화 & Windows CRLF 방지)
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew && ./gradlew dependencies --no-daemon || true

# 소스 코드 복사 및 애플리케이션 빌드
COPY src ./src
RUN ./gradlew bootJar --no-daemon -x test

# 2. Runtime Stage
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install ffmpeg, python3, and yt-dlp for media extraction
RUN apk add --no-cache ffmpeg python3 py3-pip curl ca-certificates && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && \
    chmod a+rx /usr/local/bin/yt-dlp

# 빌드 결과물 복사
COPY --from=builder /app/build/libs/musichub-backend-0.0.1-SNAPSHOT.jar app.jar

ENV TZ=Asia/Seoul
EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
