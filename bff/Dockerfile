# BFF 이미지 — 로컬 Compose(`salt-platform/compose.yaml`)와 배포가 같은 이미지(`ADR-008`). 레지스트리 · CI 는 OPS-001.
# 시세 WS · 가격 워커는 launchd 상시 그대로 — 이 이미지는 REST 만 띄운다(서버 스위치 · 그림자 검증용).
FROM node:22.12-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM node:22.12-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
# 라우팅 표는 이미지 밖에서 갈아 끼운다(볼륨) — 기본값은 저장소 표
COPY config ./config
USER node
EXPOSE 4001
CMD ["node", "dist/rest/server.js"]
