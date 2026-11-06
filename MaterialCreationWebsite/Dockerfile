FROM maven:3.9.10-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
ENV SERVER_PORT=8080
ENV UPLOAD_DIR=/app/uploads
COPY --from=build /workspace/target/MaterialCreationWebsite-0.0.1-SNAPSHOT.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
