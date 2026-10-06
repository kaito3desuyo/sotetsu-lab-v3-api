import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

/**
 * preflight（OPTIONS）の結果をブラウザが覚えておく秒数。Chrome の上限の 2 時間。
 * 付けないとブラウザは約 5 秒しか覚えず、認証ヘッダー付きの GET のたびに OPTIONS が
 * CloudFront を素通りして Lambda を起動していた（2026-10-07）。
 */
const PREFLIGHT_MAX_AGE_SECONDS = 7200;

export function corsOptions(origin: string | undefined): CorsOptions {
    return {
        origin: origin || '*',
        maxAge: PREFLIGHT_MAX_AGE_SECONDS,
    };
}
