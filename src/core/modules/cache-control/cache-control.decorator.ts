import { SetMetadata } from '@nestjs/common';

export const CACHE_CONTROL_METADATA_KEY = 'cache-control';

/**
 * 成功した返答に付ける Cache-Control を指定する。書くのは `CacheControlInterceptor`。
 * Nest の `@Header()` は handler の前に付くため、例外の返答にも残ってブラウザが失敗を覚えてしまう。
 */
export const CacheControl = (value: string): MethodDecorator =>
    SetMetadata(CACHE_CONTROL_METADATA_KEY, value);
