FROM node:lts as development

RUN npm i -g @nestjs/cli

RUN mkdir -p /home/sotetsu-lab-v3-api && chown node:node /home/sotetsu-lab-v3-api

USER node

ENV NODE_ENV='development'

ENV TZ='Asia/Tokyo'

WORKDIR /home/sotetsu-lab-v3-api

COPY . /home/sotetsu-lab-v3-api

RUN npm install



FROM development as builder

RUN npm run build



FROM node:lts-alpine as production

ENV NODE_ENV='production'

ENV TZ='Asia/Tokyo'

WORKDIR /home/sotetsu-lab-v3-api

COPY --from=builder /home/sotetsu-lab-v3-api/package*.json /home/sotetsu-lab-v3-api/

COPY --from=builder /home/sotetsu-lab-v3-api/dist /home/sotetsu-lab-v3-api/dist

RUN npm install

EXPOSE 3000

CMD ["npm", "run", "start:prod"]