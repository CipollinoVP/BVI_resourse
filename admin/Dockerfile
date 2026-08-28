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

# Копируем собранные файлы из папки dist (Vite по умолчанию создает dist)
COPY --from=builder /app/dist /usr/share/nginx/html

# Экспонируем порт (по умолчанию)
EXPOSE 8660

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]