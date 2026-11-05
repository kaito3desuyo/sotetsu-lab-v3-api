export type DbTarget = 'local' | 'production';

export interface DatabaseTarget {
    db: DbTarget;
    auth: DbTarget;
}

/** 接続先のホストが Supabase のクラウド（*.supabase.com / *.supabase.co）なら本番、それ以外は手元 */
export function classifyUrl(
    url: string | undefined,
    name = 'DATABASE_URL',
): DbTarget {
    if (!url) {
        throw new Error(`${name} が無い`);
    }

    let host: string;
    try {
        host = new URL(url).hostname.toLowerCase();
    } catch {
        throw new Error(`${name} を URL として解釈できない`);
    }

    const isSupabaseCloud = ['supabase.com', 'supabase.co'].some(
        (domain) => host === domain || host.endsWith(`.${domain}`),
    );
    return isSupabaseCloud ? 'production' : 'local';
}

/** 本番の Lambda の上か。AWS_LAMBDA_FUNCTION_NAME は Lambda が必ず入れる予約変数（NODE_ENV は手元でも付けられるので使わない） */
export function isOnLambda(env: NodeJS.ProcessEnv): boolean {
    return Boolean(env.AWS_LAMBDA_FUNCTION_NAME);
}

export function resolveDatabaseTarget(env: NodeJS.ProcessEnv): DatabaseTarget {
    const db = classifyUrl(env.DATABASE_URL, 'DATABASE_URL');
    const auth = classifyUrl(env.SUPABASE_URL, 'SUPABASE_URL');
    return { db, auth };
}

const LABEL: Record<DbTarget, string> = { local: '手元', production: '本番' };

/** DB と Auth の向きが食い違っていたら止める。どちらを直すかが分かるよう両方の向き先を出す */
export function assertTargetsAgree(t: DatabaseTarget): void {
    if (t.db !== t.auth) {
        throw new Error(
            `DATABASE_URL は${LABEL[t.db]}、SUPABASE_URL は${LABEL[t.auth]}を向いている。` +
                '向きをそろえること（.env.local の DATABASE_URL と SUPABASE_URL を同じ側にする）',
        );
    }
}

export function describeDatabaseTarget(t: DatabaseTarget): string {
    return `DB: ${LABEL[t.db]} / Auth: ${LABEL[t.auth]}`;
}

/**
 * 手元の api・CLI・TypeORM の CLI は本番の DB につながない。
 * 本番 DB を指していて、Lambda の上でなく、SOTETSU_PROD_MIGRATION=confirmed（migration:run:prod の中だけ）でもなければ、起動を止める。
 * pooler（Supavisor）は接続時の読み取り専用の指定を無視し、SET は共有の裏 backend に残るので、読み取り専用で立てる方式は取らない。
 * DATABASE_URL が無ければつなぐ先が無いので通す。メッセージに接続文字列は含めない。
 */
export function assertNotProdOutsideLambda(env: NodeJS.ProcessEnv): void {
    if (isOnLambda(env) || !env.DATABASE_URL) {
        return;
    }
    if (env.SOTETSU_PROD_MIGRATION === 'confirmed') {
        return;
    }
    if (classifyUrl(env.DATABASE_URL, 'DATABASE_URL') === 'production') {
        throw new Error(
            'DATABASE_URL が本番の DB を向いているので起動しない。' +
                '手元の api は本番につながない（.env.local を手元の Supabase に向けること）。' +
                '本番への migration は npm run migration:run:prod を使う',
        );
    }
}
