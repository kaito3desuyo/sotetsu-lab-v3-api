import {
    assertNotProdOutsideLambda,
    assertTargetsAgree,
    classifyUrl,
    describeDatabaseTarget,
    isOnLambda,
    resolveDatabaseTarget,
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
    it('本番の DB と Auth を本番と判定する', () => {
        expect(
            resolveDatabaseTarget({
                DATABASE_URL: PROD_DB,
                SUPABASE_URL: PROD_AUTH,
            }),
        ).toEqual({ db: 'production', auth: 'production' });
    });

    it('手元の DB と Auth を手元と判定する', () => {
        expect(
            resolveDatabaseTarget({
                DATABASE_URL: LOCAL_DB,
                SUPABASE_URL: LOCAL_AUTH,
            }),
        ).toEqual({ db: 'local', auth: 'local' });
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

describe('assertNotProdOutsideLambda', () => {
    it('本番 DB・Lambda の外・確認なしなら起動を止める', () => {
        expect(() =>
            assertNotProdOutsideLambda({ DATABASE_URL: PROD_DB }),
        ).toThrow(/本番/);
    });

    it('止めるときのメッセージに接続文字列（パスワード・ホスト）を含めない', () => {
        let message = '';
        try {
            assertNotProdOutsideLambda({ DATABASE_URL: PROD_DB });
        } catch (e) {
            message = e instanceof Error ? e.message : String(e);
        }
        expect(message).not.toBe('');
        expect(message).not.toMatch(/u:p@|pooler|supabase/);
    });

    it('NODE_ENV=production でも Lambda の外なら止める', () => {
        expect(() =>
            assertNotProdOutsideLambda({
                DATABASE_URL: PROD_DB,
                NODE_ENV: 'production',
            }),
        ).toThrow(/本番/);
    });

    it('SOTETSU_PROD_MIGRATION が confirmed 以外なら止める', () => {
        expect(() =>
            assertNotProdOutsideLambda({
                DATABASE_URL: PROD_DB,
                SOTETSU_PROD_MIGRATION: 'yes',
            }),
        ).toThrow(/本番/);
    });

    it('Lambda の上なら通す', () => {
        expect(() =>
            assertNotProdOutsideLambda({
                DATABASE_URL: PROD_DB,
                AWS_LAMBDA_FUNCTION_NAME: 'fn',
            }),
        ).not.toThrow();
    });

    it('SOTETSU_PROD_MIGRATION=confirmed なら通す', () => {
        expect(() =>
            assertNotProdOutsideLambda({
                DATABASE_URL: PROD_DB,
                SOTETSU_PROD_MIGRATION: 'confirmed',
            }),
        ).not.toThrow();
    });

    it('手元の DB なら通す', () => {
        expect(() =>
            assertNotProdOutsideLambda({ DATABASE_URL: LOCAL_DB }),
        ).not.toThrow();
    });

    it('DATABASE_URL が無ければ通す（つなぐ先が無い）', () => {
        expect(() => assertNotProdOutsideLambda({})).not.toThrow();
    });

    it('DATABASE_URL が URL として読めなければ例外', () => {
        expect(() =>
            assertNotProdOutsideLambda({ DATABASE_URL: 'not a url' }),
        ).toThrow();
    });
});

describe('assertTargetsAgree', () => {
    it('DB と Auth の向きが違えば、両方の向き先を含めて例外', () => {
        expect(() =>
            assertTargetsAgree({
                db: 'local',
                auth: 'production',
            }),
        ).toThrow(/DATABASE_URL.*手元.*SUPABASE_URL.*本番/s);
    });

    it('逆向きの食い違いも例外', () => {
        expect(() =>
            assertTargetsAgree({
                db: 'production',
                auth: 'local',
            }),
        ).toThrow(/DATABASE_URL.*本番.*SUPABASE_URL.*手元/s);
    });

    it('同じなら何もしない', () => {
        expect(() =>
            assertTargetsAgree({
                db: 'local',
                auth: 'local',
            }),
        ).not.toThrow();
    });
});

describe('describeDatabaseTarget', () => {
    it('本番', () => {
        expect(
            describeDatabaseTarget({ db: 'production', auth: 'production' }),
        ).toBe('DB: 本番 / Auth: 本番');
    });

    it('手元', () => {
        expect(describeDatabaseTarget({ db: 'local', auth: 'local' })).toBe(
            'DB: 手元 / Auth: 手元',
        );
    });
});
