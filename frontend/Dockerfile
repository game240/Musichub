# 1. Build Stage
FROM node:20-alpine AS builder
WORKDIR /app

# pnpm 활성화
RUN corepack enable && corepack prepare pnpm@latest --activate

# 종속성 파일 복사 및 설치
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# 소스 코드 복사
COPY . .

# Vite 빌드 시 주입될 환경변수 인수
ARG VITE_GOOGLE_CLIENT_ID=778015652430-f0hntsiqdgrrj4a5o9htf5o03hjgiqpi.apps.googleusercontent.com
ARG VITE_API_BASE_URL=/api
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# 프로덕션 빌드
RUN pnpm build

# 2. Runtime Stage (Nginx)
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# 빌드 결과물 및 Nginx 설정 복사
COPY --from=builder /app/dist ./
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
