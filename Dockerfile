ARG APP_NAME="sotetsu-lab-v3-api"

FROM node:20 as base

################################################################################

FROM base as install-dependencies

ENV TZ="Asia/Tokyo"
ENV NODE_ENV="development"
RUN npm i -g @nestjs/cli
USER node

################################################################################

FROM install-dependencies as development-base

ARG APP_NAME

RUN mkdir /home/node/${APP_NAME} 
WORKDIR /home/node/${APP_NAME}
COPY --chown=node:node ./package*.json ./
RUN npm ci
COPY --chown=node:node . .

################################################################################

FROM development-base as production-build

RUN npm run build

################################################################################

FROM node:20-alpine as production-hosting

ARG APP_NAME

COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.7.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT="3000"
ENV READINESS_CHECK_PATH="/health-check"

ENV TZ="Asia/Tokyo"
ENV NODE_ENV="production"
USER node
RUN mkdir /home/node/${APP_NAME} 
WORKDIR /home/node/${APP_NAME}
COPY --from=production-build --chown=node:node /home/node/${APP_NAME}/package*.json ./
COPY --from=production-build --chown=node:node /home/node/${APP_NAME}/dist ./dist
RUN npm ci --production
EXPOSE 3000
CMD ["npm", "run", "start:prod"]