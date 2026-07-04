# apply-ax 배포용 Dockerfile (Railway 등 컨테이너 플랫폼)
# better-sqlite3(네이티브 모듈) 컴파일을 위해 빌드 도구를 포함한다.
FROM node:22-bookworm-slim

# 네이티브 모듈(node-gyp) 빌드 도구
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐시 활용)
COPY package.json package-lock.json ./
RUN npm ci

# 소스 복사 후 프로덕션 빌드
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3000
# 영구 디스크(볼륨) 경로 — Railway 볼륨을 /data 에 마운트하는 것을 전제로 한다.
ENV DATA_DIR=/data/db
ENV UPLOAD_DIR=/data/uploads

EXPOSE 3000

# 부팅 시 관리자 시드(이미 있으면 건너뜀, 최초 1회만 비밀번호를 로그에 출력) 후 서버 기동
CMD ["sh", "-c", "node scripts/seed-admins.mjs; exec npx next start -p ${PORT:-3000} -H 0.0.0.0"]
