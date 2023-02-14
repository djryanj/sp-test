FROM node:11-alpine
RUN apk add tzdata
LABEL maintainer="Ryan Jacobs ryan@ryanjjacobs.com"
RUN mkdir -p /app
WORKDIR /app
COPY . /app
RUN npm install
EXPOSE 3000
CMD ["node", "./bin/www"]