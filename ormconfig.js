module.exports = {
    type: 'postgres',
    url: 'postgresql://seapolis_user:railwayfun1996@localhost/sotetsu_lab_v3_api',
    entities: ['src/main/v1/**/*.entity{.ts,.js}'],
    migrations: ["src/db/migrations/**/*.ts"],
    cli: {
        migrationsDir: "src/db/migrations",
    },
    synchronize: false,
    logging: true,
}