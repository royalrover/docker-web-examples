FROM node:8-slim
COPY ./ /usr/local/app
WORKDIR /usr/local/app
RUN npm i --registry=https://registry.npm.taobao.org
ENV NODE_ENV dev
EXPOSE 8090  