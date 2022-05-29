ARG APP_NAME="sotetsu-lab-v3-api"

FROM node:14-slim as base

################################################################################

FROM base as install-dependencies

ENV TZ="Asia/Tokyo"
ENV NODE_ENV="development"
RUN npm i -g @nestjs/cli
USER node

################################################################################

FROM install-dependencies as development-base

ARG APP_NAME

WORKDIR /home/node/${APP_NAME}
COPY --chown=node:node ./package*.json ./
RUN npm ci
COPY --chown=node:node . .

################################################################################

FROM development-base as production-build

RUN npm run build

################################################################################

FROM node:14-alpine as production-hosting

ARG APP_NAME

ENV TZ="Asia/Tokyo"
ENV NODE_ENV="production"
WORKDIR /home/node/${APP_NAME}
COPY --from=production-build /home/node/${APP_NAME}/package*.json ./
COPY --from=production-build /home/node/${APP_NAME}/dist ./dist
RUN npm ci --production
EXPOSE 3000
CMD ["npm", "run", "start:prod"]