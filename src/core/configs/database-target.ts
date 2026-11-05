export type DbTarget = 'local' | 'production';

export interface DatabaseTarget {
    db: DbTarget;
    auth: DbTarget;
    readOnly: boolean;
}

const READ_ONLY_OPTIONS = '-c default_transaction_read_only=on';

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

/** 本番 DB を Lambda の外から見るときは読み取り専用。外せるのは migration:run:prod（SOTETSU_PROD_MIGRATION=confirmed）だけ */
function isReadOnly(db: DbTarget, env: NodeJS.ProcessEnv): boolean {
    return (
        db === 'production' &&
        !isOnLambda(env) &&
        env.SOTETSU_PROD_MIGRATION !== 'confirmed'
    );
}

export function resolveDatabaseTarget(env: NodeJS.ProcessEnv): DatabaseTarget {
    const db = classifyUrl(env.DATABASE_URL, 'DATABASE_URL');
    const auth = classifyUrl(env.SUPABASE_URL, 'SUPABASE_URL');
    return { db, auth, readOnly: isReadOnly(db, env) };
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
    const db = `${LABEL[t.db]}${t.readOnly ? '（読み取り専用）' : ''}`;
    return `DB: ${db} / Auth: ${LABEL[t.auth]}`;
}

export function readOnlyConnectionExtra(
    t: Pick<DatabaseTarget, 'readOnly'>,
): Record<string, unknown> {
    return t.readOnly ? { options: READ_ONLY_OPTIONS } : {};
}

/**
 * database.config.ts 用。読み取り専用の判定は DB の向きだけで決まるので SUPABASE_URL は見ない。
 * Lambda の上では DATABASE_URL を解釈せず空を返す（本番を巻き込まない）。
 * DATABASE_URL が無いときも空（接続しないテストが設定を読めるように。起動の停止は createApp が受け持つ）。
 */
export function resolveReadOnlyExtra(
    env: NodeJS.ProcessEnv,
): Record<string, unknown> {
    if (isOnLambda(env) || !env.DATABASE_URL) {
        return {};
    }
    const db = classifyUrl(env.DATABASE_URL, 'DATABASE_URL');
    return readOnlyConnectionExtra({ readOnly: isReadOnly(db, env) });
}
