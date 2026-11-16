import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * 回送・試運転・不明の種別の色を #9e9e9e から #8a8a8a にする。
 * 白字のコントラストが 2.68 から 3.45 に上がる。client の灰の既定値も #8a8a8a にそろえる。
 * 名前で選ばず id で選ぶ（本番で確かめた 3 件）。
 */
const GREY_TRIP_CLASS_IDS = [
    "0f26af72-de4e-4851-91ca-62eab0db4371", // 回送
    "ebf6e84d-74a1-4459-bec3-9a99bc413621", // 試運転
    "e780c6b1-29ef-4126-b826-68da78ee9983", // 不明
];

export class DarkenGreyTripClassColor1794817967783 implements MigrationInterface {
    name = 'DarkenGreyTripClassColor1794817967783'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE "trip_classes" SET "trip_class_color" = '#8a8a8a' WHERE "id" = ANY($1) AND lower("trip_class_color") = '#9e9e9e'`,
            [GREY_TRIP_CLASS_IDS],
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `UPDATE "trip_classes" SET "trip_class_color" = '#9e9e9e' WHERE "id" = ANY($1) AND lower("trip_class_color") = '#8a8a8a'`,
            [GREY_TRIP_CLASS_IDS],
        );
    }

}
