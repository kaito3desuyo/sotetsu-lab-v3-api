import { NextFunction, Request, Response } from 'express';
import onHeaders from 'on-headers';

/**
 * エラーの返答（400 以上）は、どの経路でも `no-store` にする。
 * Cache-Control が無いと、CloudFront は 404・414・5xx を既定で 10 秒キャッシュし、
 * 認証の有無に関わらず同じ URL の全員に返してしまう。guard や ValidationPipe の返答は
 * interceptor を通らないので、express のミドルウェアとして全リクエストに掛ける。
 */
export const noStoreOnError = (
    _req: Request,
    res: Response,
    next: NextFunction,
): void => {
    onHeaders(res, () => {
        if (res.statusCode >= 400) {
            res.setHeader('Cache-Control', 'no-store');
        }
    });
    next();
};
