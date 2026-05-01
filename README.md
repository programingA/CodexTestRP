# Cinema Memory

영화관 테마로 추억을 `필름` 단위로 저장하고, 영사기 감상 화면에서 파노라마처럼 다시 보는 웹 서비스입니다.

## Monorepo

- `apps/web`: Next.js App Router frontend
- `apps/api`: Spring Boot backend
- `infra`: local development helpers

## Core Stack

- Frontend: Next.js, TypeScript, TailwindCSS, Framer Motion, Three.js
- Backend: Spring Boot, Spring Security, OAuth2 Client, JPA, Flyway, springdoc OpenAPI
- Data: MySQL for durable data, Redis for refresh tokens
- Media: S3 presigned uploads, CloudFront delivery URL
- Deployment target: Vercel frontend, AWS ECS Fargate backend

## Local Development

Start infrastructure:

```powershell
docker compose -f infra/docker-compose.yml up -d
```

Run the frontend:

```powershell
cd apps/web
npm.cmd install
npm.cmd run dev
```

Run the backend with JDK 21 and Maven:

```powershell
cd apps/api
mvn spring-boot:run
```

The backend exposes OpenAPI at `http://localhost:8080/swagger-ui/index.html`.

Copy `apps/web/.env.example` and `apps/api/.env.example` before connecting real OAuth and AWS credentials.
