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

/**
 * Resource Timing で API の待ち時間と大きさを読めるようにする（Timing-Allow-Origin）。
 * client は別 origin なので、付けないとブラウザは API の TTFB やサイズを 0 として返す。
 * CORS と同じ origin に許す。
 */
export function timingAllowOrigin(origin: string | undefined) {
    const value = origin || '*';
    return (
        _req: unknown,
        res: { setHeader(name: string, value: string): unknown },
        next: () => void,
    ): void => {
        res.setHeader('Timing-Allow-Origin', value);
        next();
    };
}
