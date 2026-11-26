import { Injectable } from '@nestjs/common';
import { calendarCacheTags } from '../../../core/modules/cdn-invalidation/cache-tags.js';
import { SharedCache } from '../../../core/modules/shared-cache/shared-cache.js';
import { OperationModel } from '../infrastructure/models/operation.model.js';
import { OperationQuery } from '../infrastructure/queries/operation.query.js';

/**
 * 運用の現在位置の材料（列車と時刻つきの運用 model）を共有キャッシュ越しに読む。
 * 位置の計算は時刻で変わるので、ここではしない（呼び出し側が毎回する）。
 * キーは並べ替えて重ねない運用の id、タグはその運用のダイヤとつながる列車のダイヤ（calendar:<id>）。
 */
@Injectable()
export class OperationCurrentPositionReader {
    constructor(
        private readonly operationQuery: OperationQuery,
        private readonly sharedCache: SharedCache,
    ) {}

    /** 要求の id の順で返す。見つからない id は省く。 */
    async findManyForCurrentPosition(params: {
        operationIds: string[];
        bypass?: boolean;
    }): Promise<OperationModel[]> {
        if (params.operationIds.length === 0) return [];

        const sortedIds = [...new Set(params.operationIds)].sort();
        const found = await this.operationQuery.findCalendarIdByOperationIds({
            operationIds: sortedIds,
        });

        // 存在しない id を含む要求は置かない。あとでその運用ができても、
        // 含まれる運用のダイヤのタグでは捨てられず、古い値が残るため
        if (
            new Set(found.map((row) => row.operationId)).size < sortedIds.length
        ) {
            return this.#sortByRequest(
                await this.operationQuery.findManyForCurrentPosition({
                    operationIds: sortedIds,
                }),
                params.operationIds,
            );
        }
        // 運用のダイヤに加え、つながる列車のダイヤも足す。trip-blocks の書き換えは
        // 列車のダイヤでタグを捨てるので、両者が食い違う行でも捨てられるように
        const calendarIds = [
            ...new Set(
                found.flatMap((row) =>
                    row.tripCalendarId
                        ? [row.calendarId, row.tripCalendarId]
                        : [row.calendarId],
                ),
            ),
        ];

        const models = await this.sharedCache.getOrLoad<OperationModel[]>({
            namespace: 'operation-current-positions',
            key: sortedIds,
            tags: calendarCacheTags(calendarIds),
            bypass: params.bypass,
            load: () =>
                this.operationQuery.findManyForCurrentPosition({
                    operationIds: sortedIds,
                }),
        });

        return this.#sortByRequest(models, params.operationIds);
    }

    #sortByRequest(
        models: OperationModel[],
        operationIds: string[],
    ): OperationModel[] {
        const byId = new Map(models.map((model) => [model.id, model]));
        return operationIds
            .map((id) => byId.get(id))
            .filter((model) => model !== undefined);
    }
}
