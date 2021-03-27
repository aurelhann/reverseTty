FROM node:14.15.1-stretch-slim

LABEL maintainer="aurelien.hannoteaux@braincube.com"

RUN mkdir /reverseTty
WORKDIR /reverseTty

COPY ./.bin/reverseTtyServer.mjs /reverseTty/reverseTtyServer.mjs

EXPOSE 8000

ENTRYPOINT ["node", "--experimental-json-modules", "/reverseTty/reverseTtyServer.mjs"]
