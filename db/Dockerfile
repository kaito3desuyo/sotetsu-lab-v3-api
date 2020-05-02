FROM postgis/postgis:12-master

RUN localedef -i ja_JP -f UTF-8 ja_JP.UTF-8

RUN echo 'LANG="ja_JP.UTF-8"' > /etc/locale.conf

ENV LANG ja_JP.UTF-8

COPY ./init /docker-entrypoint-initdb.d