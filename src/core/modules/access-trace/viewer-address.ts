import { isIP } from 'node:net';
import type { Request } from 'express';

/**
 * CloudFront の `cloudfront-viewer-address`（`IP:ポート`・IPv6 は `[IP]:ポート` か `IP:ポート`）から IP を取り出す。
 * IPv6 は IP の中にも `:` があるので、最後の `:` より前を IP とする。
 */
export function parseViewerAddress(
    header: string | string[] | undefined,
): string | null {
    const value = Array.isArray(header) ? header[0] : header;
    if (!value) return null;
    const colon = value.lastIndexOf(':');
    if (colon <= 0) return null;
    const host = value.slice(0, colon);
    const ip =
        host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
    return isIP(ip) === 0 ? null : ip;
}

export function readViewerContext(req: Request): {
    ip: string | null;
    userAgent: string | null;
} {
    return {
        ip: parseViewerAddress(req.headers['cloudfront-viewer-address']),
        userAgent: req.headers['user-agent'] ?? null,
    };
}
