#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
    CREATE DATABASE sotetsu_lab_v3_development;
    CREATE DATABASE sotetsu_lab_v3_test;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "sotetsu_lab_v3_development" <<-EOSQL
    CREATE EXTENSION postgis;
EOSQL

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "sotetsu_lab_v3_test" <<-EOSQL
    CREATE EXTENSION postgis;
EOSQL