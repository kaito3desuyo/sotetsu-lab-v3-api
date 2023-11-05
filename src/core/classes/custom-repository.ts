import { TypeOrmCrudService } from '@nestjsx/crud-typeorm';
import {
    DeepPartial,
    QueryRunner,
    RemoveOptions,
    Repository,
    SaveOptions,
    SelectQueryBuilder,
} from 'typeorm';

export abstract class CustomRepository<
    Entity,
> extends TypeOrmCrudService<Entity> {
    constructor(protected readonly repository: Repository<Entity>) {
        super(repository);
    }

    save<T extends DeepPartial<Entity>>(
        entities: T[],
        options: SaveOptions & {
            reload: false;
        },
    ): Promise<T[]>;
    save<T extends DeepPartial<Entity>>(
        entities: T[],
        options?: SaveOptions,
    ): Promise<(T & Entity)[]>;
    save<T extends DeepPartial<Entity>>(
        entity: T,
        options: SaveOptions & {
            reload: false;
        },
    ): Promise<T>;
    save<T extends DeepPartial<Entity>>(
        entity: T,
        options?: SaveOptions,
    ): Promise<T & Entity>;
    save<T extends DeepPartial<Entity>>(
        entityOrEntities: T | T[],
        options?: SaveOptions,
    ): Promise<T | T[]> {
        return this.repository.save<T>(entityOrEntities as any, options);
    }

    remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;
    remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;
    remove(
        entityOrEntities: Entity | Entity[],
        options?: RemoveOptions,
    ): Promise<Entity | Entity[]> {
        return this.repository.remove(entityOrEntities as any, options);
    }

    createQueryBuilder(
        alias?: string,
        queryRunner?: QueryRunner,
    ): SelectQueryBuilder<Entity> {
        return this.repository.createQueryBuilder(alias, queryRunner);
    }
}
