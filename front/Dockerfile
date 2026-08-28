FROM dh-mirror.gitverse.ru/library/node:24.15.0-alpine AS build

WORKDIR /frontend
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
ARG FRONTEND_PRODUCTION_URL
ENV VITE_PRODUCTION_URL=${FRONTEND_PRODUCTION_URL}
RUN npm run build

FROM steebchen/nginx-spa:stable
COPY --from=build /frontend/dist /app
EXPOSE 80
CMD nginx