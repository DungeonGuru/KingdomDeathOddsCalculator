FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --include=dev
COPY . .
RUN npm run build

FROM nginx:alpine AS runtime
ENV NGINX_ENTRYPOINT_QUIET_LOGS=1 \
    PORT=80
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/ || exit 1

CMD ["sh","-c","echo '\nOpen → http://localhost:'8080'\n' && nginx -g 'daemon off;'"]
