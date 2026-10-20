import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SaveOptions } from 'typeorm';
import { TripOperationListModel } from 'src/libs/trip/infrastructure/models/trip-operation-list.model';
import { TripBlock, TripBlocks } from '../../domain/trip-block.domain';
import { TripBlockDetailsDto } from '../../usecase/dtos/trip-block-details.dto';
import {
    TripBlockDtoBuilder,
    TripBlocksDtoBuilder,
} from '../builders/trip-block.dto.builder';
import {
    TripBlockModelBuilder,
    TripBlocksModelBuilder,
} from '../builders/trip-block.model.builder';
import { TripBlockModel } from '../models/trip-block.model';

@Injectable()
export class TripBlockCommand {
    constructor(
        @InjectRepository(TripBlockModel)
        private readonly tripBlockRepository: Repository<TripBlockModel>,
    ) {}

    async bulkCreate(
        domains: TripBlocks,
        options?: SaveOptions,
    ): Promise<TripBlockDetailsDto[]> {
        const models = TripBlocksModelBuilder.buildFromDomain(domains);
        const result = await this.tripBlockRepository.save(models, options);
        return TripBlocksDtoBuilder.buildFromModel(result);
    }

    // =========================================================================

    async replaceOneTripBlockByDomain(
        domain: TripBlock,
    ): Promise<TripBlockDetailsDto> {
        const model = TripBlockModelBuilder.buildFromDomain(domain);
        const result = await this.tripBlockRepository.manager.transaction(
            async (manager) => {
                await this.clearChangingNextLinks(manager, model);
                return manager.getRepository(TripBlockModel).save(model);
            },
        );
        return TripBlockDtoBuilder.buildFromModel(result);
    }

    /**
     * 「次の区間」の付け替えは、1 回の書き込みの中で a の先を外し b が同じ先を指すことがある。
     * 保存順しだいで一意索引に当たるため、先に変わる区間の値を null にしておく（同じトランザクション内）。
     */
    private async clearChangingNextLinks(
        manager: EntityManager,
        model: TripBlockModel,
    ): Promise<void> {
        const proposed = new Map<string, string | null>();
        for (const trip of model.trips ?? []) {
            for (const o of trip.tripOperationLists ?? []) {
                if (o.id && o.nextTripOperationListId !== undefined) {
                    proposed.set(o.id, o.nextTripOperationListId);
                }
            }
        }
        if (proposed.size === 0) return;
        const repository = manager.getRepository(TripOperationListModel);
        const current = await repository
            .createQueryBuilder('tol')
            .select(['tol.id', 'tol.nextTripOperationListId'])
            .where('tol.id IN (:...ids)', { ids: [...proposed.keys()] })
            .getMany();
        const ids = current
            .filter(
                (o) =>
                    o.nextTripOperationListId != null &&
                    o.nextTripOperationListId !== proposed.get(o.id),
            )
            .map((o) => o.id);
        if (ids.length > 0) {
            await repository
                .createQueryBuilder()
                .update()
                .set({ nextTripOperationListId: null })
                .where('id IN (:...ids)', { ids })
                .execute();
        }

        // 消える区間など、送られてこない区間が同じ先を指していても当たるので、
        // 新しく指される先を今指している他の区間も外す
        const targets = [...proposed.entries()].filter(
            (entry): entry is [string, string] => entry[1] != null,
        );
        if (targets.length === 0) return;
        await repository
            .createQueryBuilder()
            .update()
            .set({ nextTripOperationListId: null })
            .where('next_trip_operation_list_id IN (:...targets)', {
                targets: targets.map(([, target]) => target),
            })
            .andWhere('id NOT IN (:...owners)', {
                owners: targets.map(([owner]) => owner),
            })
            .execute();
    }

    async deleteOneTripBlockByDomain(
        domain: TripBlock,
    ): Promise<TripBlockDetailsDto> {
        const model = TripBlockModelBuilder.buildFromDomain(domain);
        const result = await this.tripBlockRepository.remove(model);
        return TripBlockDtoBuilder.buildFromModel(result);
    }
}
