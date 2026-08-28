# Этап 1: Сборка приложения
FROM node:18-alpine AS builder

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --only=production

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Этап 2: Сервер для статики
FROM nginx:alpine

# Копируем собранные файлы из этапа сборки
COPY --from=builder /app/build /usr/share/nginx/html

# Копируем кастомный конфиг nginx (опционально)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

# Экспонируем порт (по умолчанию)
EXPOSE 8660

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]