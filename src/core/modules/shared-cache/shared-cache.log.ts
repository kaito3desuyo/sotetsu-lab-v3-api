/**
 * 捨てるのに失敗したときの warn の先頭の文言。
 * serverless.ts のログのメトリクスフィルター（アラーム）がこの文言で数えるので、変えるときは両方そろえる。
 * serverless.ts から読むので、依存の重い import は足さない。
 */
export const SHARED_CACHE_INVALIDATE_FAILED_MESSAGE =
    '共有キャッシュの破棄に失敗しました';
