import pg from 'pg';
import { ReadOnlyClient, READ_ONLY_SQL } from './read-only-client.js';

describe('ReadOnlyClient', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('接続できたら default_transaction_read_only を on にしてから接続の完了を返す（callback 形式）', () => {
        const order: string[] = [];
        vi.spyOn(pg.Client.prototype, 'connect').mockImplementation(((
            cb: (err?: Error) => void,
        ) => {
            order.push('connect');
            cb();
        }) as never);
        vi.spyOn(pg.Client.prototype, 'query').mockImplementation(((
            sql: string,
            cb: (err?: Error) => void,
        ) => {
            order.push(sql);
            cb();
        }) as never);

        const done = vi.fn();
        new ReadOnlyClient({}).connect(done);

        expect(order).toEqual(['connect', READ_ONLY_SQL]);
        expect(done).toHaveBeenCalledOnce();
        expect(done).toHaveBeenCalledWith(null, expect.anything());
    });

    it('接続に失敗したら SET せずにそのエラーを返す', () => {
        const error = new Error('refused');
        vi.spyOn(pg.Client.prototype, 'connect').mockImplementation(((
            cb: (err?: Error) => void,
        ) => cb(error)) as never);
        const query = vi
            .spyOn(pg.Client.prototype, 'query')
            .mockImplementation((() => undefined) as never);

        const done = vi.fn();
        new ReadOnlyClient({}).connect(done);

        expect(query).not.toHaveBeenCalled();
        expect(done).toHaveBeenCalledWith(error);
    });

    it('SET に失敗したらそのエラーを返す（読み取り専用にできないまま使わせない）', () => {
        const error = new Error('set failed');
        vi.spyOn(pg.Client.prototype, 'connect').mockImplementation(((
            cb: (err?: Error) => void,
        ) => cb()) as never);
        vi.spyOn(pg.Client.prototype, 'query').mockImplementation(((
            _sql: string,
            cb: (err?: Error) => void,
        ) => cb(error)) as never);

        const done = vi.fn();
        new ReadOnlyClient({}).connect(done);

        expect(done).toHaveBeenCalledWith(error);
    });

    it('Promise 形式でも SET してから解決する', async () => {
        const order: string[] = [];
        vi.spyOn(pg.Client.prototype, 'connect').mockImplementation((() => {
            order.push('connect');
            return Promise.resolve();
        }) as never);
        vi.spyOn(pg.Client.prototype, 'query').mockImplementation(((
            sql: string,
        ) => {
            order.push(sql);
            return Promise.resolve();
        }) as never);

        await new ReadOnlyClient({}).connect();

        expect(order).toEqual(['connect', READ_ONLY_SQL]);
    });
});
