# Этап 1: Сборка приложения
FROM node:22-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем ВСЕ зависимости (включая devDependencies)
RUN npm ci

# Копируем исходный код
COPY . .

# Собираем приложение с Vite
RUN npm run build

# Этап 2: Сервер для статики
FROM nginx:alpine

# Копируем собранные файлы из папки dist
COPY --from=builder /app/dist /usr/share/nginx/html

# 🆕 Копируем кастомный конфиг Nginx для SPA
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $$uri $$uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Экспонируем порт
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]