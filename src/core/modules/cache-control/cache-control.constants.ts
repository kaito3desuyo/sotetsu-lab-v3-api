/**
 * v3 GET の Cache-Control。どれも private なので CloudFront には置かれず、利用者のブラウザだけが覚える
 * （CloudFront の共有キャッシュは認証を素通りするため不採用。2026-10-07）。
 * TIMETABLE の 3600 秒は、クライアントが書き込み後に `cache: 'reload'` で取る窓の長さと同じでなければならない
 * （sotetsu-lab-v3-client の docs/superpowers/specs/2026-10-07-browser-private-cache-design.md）。
 */
export const CACHE_CONTROL = {
    MASTER: 'private, max-age=3600',
    TIMETABLE: 'private, max-age=3600',
    REALTIME: 'no-store',
} as const;
