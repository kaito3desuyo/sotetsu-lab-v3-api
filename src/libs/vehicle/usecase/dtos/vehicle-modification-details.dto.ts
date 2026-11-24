import { Expose } from 'class-transformer';

export class VehicleModificationDetailsDto {
    @Expose()
    id!: string;

    @Expose()
    vehicleId!: string;

    @Expose()
    modifiedOn!: string | null;

    @Expose()
    kind!: string;

    @Expose()
    value!: string | null;

    @Expose()
    description!: string | null;

    @Expose()
    createdAt!: Date;

    @Expose()
    updatedAt!: Date;
}
