FROM node:10.15-alpine
WORKDIR /api
COPY ./ /api

ENV TZ='Asia/Tokyo'

RUN npm install
RUN npm run build

EXPOSE 3000
CMD ["npm", "run", "start:prod"]