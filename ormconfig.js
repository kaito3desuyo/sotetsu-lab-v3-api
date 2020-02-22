module.exports = {
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: ['src/**/*.entity{.ts,.js}'],
    migrations: ['src/db/migrations/**/*.ts'],
    cli: {
        migrationsDir: 'src/db/migrations',
    },
    synchronize: false,
    logging: true,
};
