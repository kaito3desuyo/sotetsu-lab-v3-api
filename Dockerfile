FROM node:10.15-alpine
WORKDIR /api
COPY ./ /api

RUN npm install
RUN npm run build
CMD ["npm", "run", "start"]