import { ReadOnlyClient } from './read-only-client.js';
import {
    assertTargetsAgree,
    classifyUrl,
    describeDatabaseTarget,
    isOnLambda,
    readOnlyConnectionExtra,
    resolveDatabaseTarget,
    resolveReadOnlyExtra,
} from './database-target.js';

const PROD_DB =
    'postgresql://u:p@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';
const PROD_AUTH = 'https://nofubcikiabamlnlxpko.supabase.co';
const LOCAL_DB =
    'postgresql://postgres:postgres@host.docker.internal:54322/postgres';
const LOCAL_AUTH = 'http://127.0.0.1:54321';

describe('classifyUrl', () => {
    it('supabase.com のホスト（pooler）は本番', () => {
        expect(classifyUrl(PROD_DB)).toBe('production');
    });

    it('supabase.co のホストは本番', () => {
        expect(classifyUrl(PROD_AUTH)).toBe('production');
    });

    it('host.docker.internal は手元', () => {
        expect(classifyUrl(LOCAL_DB)).toBe('local');
    });

    it('127.0.0.1 は手元', () => {
        expect(classifyUrl(LOCAL_AUTH)).toBe('local');
    });

    it('supabase.co に似た別ドメインは本番にしない', () => {
        expect(classifyUrl('https://evilsupabase.co')).toBe('local');
    });

    it('未設定は例外', () => {
        expect(() => classifyUrl(undefined)).toThrow('DATABASE_URL');
    });

    it('解釈できない値は例外', () => {
        expect(() => classifyUrl('not a url')).toThrow();
    });
});

describe('isOnLambda', () => {
    it('AWS_LAMBDA_FUNCTION_NAME があれば true', () => {
        expect(isOnLambda({ AWS_LAMBDA_FUNCTION_NAME: 'fn' })).toBe(true);
    });

    it('無ければ false', () => {
        expect(isOnLambda({})).toBe(false);
    });
});

describe('resolveDatabaseTarget', () => {
    const prod = { DATABASE_URL: PROD_DB, SUPABASE_URL: PROD_AUTH };

    it('本番 DB・Lambda 外は読み取り専用', () => {
        expect(resolveDatabaseTarget(prod)).toEqual({
            db: 'production',
            auth: 'production',
            readOnly: true,
        });
    });

    it('本番 DB・Lambda の上は読み取り専用でない', () => {
        expect(
            resolveDatabaseTarget({ ...prod, AWS_LAMBDA_FUNCTION_NAME: 'fn' })
                .readOnly,
        ).toBe(false);
    });

    it('本番 DB・SOTETSU_PROD_MIGRATION=confirmed は読み取り専用でない', () => {
        expect(
            resolveDatabaseTarget({
                ...prod,
                SOTETSU_PROD_MIGRATION: 'confirmed',
            }).readOnly,
        ).toBe(false);
    });

    it('SOTETSU_PROD_MIGRATION が confirmed 以外なら読み取り専用のまま', () => {
        expect(
            resolveDatabaseTarget({ ...prod, SOTETSU_PROD_MIGRATION: 'yes' })
                .readOnly,
        ).toBe(true);
    });

    it('手元は読み取り専用でない', () => {
        expect(
            resolveDatabaseTarget({
                DATABASE_URL: LOCAL_DB,
                SUPABASE_URL: LOCAL_AUTH,
            }),
        ).toEqual({ db: 'local', auth: 'local', readOnly: false });
    });

    it('NODE_ENV=production でも Lambda 外なら読み取り専用', () => {
        expect(
            resolveDatabaseTarget({ ...prod, NODE_ENV: 'production' }).readOnly,
        ).toBe(true);
    });

    it('DATABASE_URL が無ければ例外', () => {
        expect(() =>
            resolveDatabaseTarget({ SUPABASE_URL: LOCAL_AUTH }),
        ).toThrow('DATABASE_URL');
    });

    it('SUPABASE_URL が無ければ例外', () => {
        expect(() => resolveDatabaseTarget({ DATABASE_URL: LOCAL_DB })).toThrow(
            'SUPABASE_URL',
        );
    });
});

describe('assertTargetsAgree', () => {
    it('DB と Auth の向きが違えば、両方の向き先を含めて例外', () => {
        expect(() =>
            assertTargetsAgree({
                db: 'local',
                auth: 'production',
                readOnly: false,
            }),
        ).toThrow(/DATABASE_URL.*手元.*SUPABASE_URL.*本番/s);
    });

    it('逆向きの食い違いも例外', () => {
        expect(() =>
            assertTargetsAgree({
                db: 'production',
                auth: 'local',
                readOnly: true,
            }),
        ).toThrow(/DATABASE_URL.*本番.*SUPABASE_URL.*手元/s);
    });

    it('同じなら何もしない', () => {
        expect(() =>
            assertTargetsAgree({
                db: 'local',
                auth: 'local',
                readOnly: false,
            }),
        ).not.toThrow();
    });
});

describe('describeDatabaseTarget', () => {
    it('本番・読み取り専用', () => {
        expect(
            describeDatabaseTarget({
                db: 'production',
                auth: 'production',
                readOnly: true,
            }),
        ).toBe('DB: 本番（読み取り専用） / Auth: 本番');
    });

    it('本番・書き込み可（Lambda など）', () => {
        expect(
            describeDatabaseTarget({
                db: 'production',
                auth: 'production',
                readOnly: false,
            }),
        ).toBe('DB: 本番 / Auth: 本番');
    });

    it('手元', () => {
        expect(
            describeDatabaseTarget({
                db: 'local',
                auth: 'local',
                readOnly: false,
            }),
        ).toBe('DB: 手元 / Auth: 手元');
    });
});

describe('readOnlyConnectionExtra', () => {
    it('読み取り専用なら、接続のたびに SET する pg の Client を返す（pooler は options を無視するため）', () => {
        expect(readOnlyConnectionExtra({ readOnly: true })).toEqual({
            Client: ReadOnlyClient,
        });
    });

    it('そうでなければ空', () => {
        expect(readOnlyConnectionExtra({ readOnly: false })).toEqual({});
    });
});

describe('resolveReadOnlyExtra', () => {
    it('本番 DB・Lambda 外なら読み取り専用の Client を返す（SUPABASE_URL が無くてもよい）', () => {
        expect(resolveReadOnlyExtra({ DATABASE_URL: PROD_DB })).toEqual({
            Client: ReadOnlyClient,
        });
    });

    it('Lambda の上では DATABASE_URL を解釈せず空', () => {
        expect(
            resolveReadOnlyExtra({
                DATABASE_URL: PROD_DB,
                AWS_LAMBDA_FUNCTION_NAME: 'fn',
            }),
        ).toEqual({});
    });

    it('DATABASE_URL が無ければ空（接続しないテストが config を読めるように）', () => {
        expect(resolveReadOnlyExtra({})).toEqual({});
    });
});
