FROM node:24.18.0-alpine3.23 AS build
WORKDIR /app
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginx:1.30.3-alpine3.23-slim
ENV BFF_UPSTREAM=http://devorecruiter-api-bff:3000
RUN apk upgrade --no-cache
COPY --from=build /app/dist/devorecruiter-front/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
