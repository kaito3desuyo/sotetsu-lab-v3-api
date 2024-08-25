import { GetManyDefaultResponse } from '@dataui/crud';
import { Request, Response } from 'express';

export function addPaginationHeaders(
    req: Request,
    res: Response,
    data: GetManyDefaultResponse<unknown>,
): void {
    res.setHeader('X-Total-Count', data.total);
    res.setHeader('X-Total-Page', data.pageCount);
    res.setHeader('X-Item-Count', data.count);
    res.setHeader('X-Item-Per-Page', req.query['limit'] as string);
    res.setHeader('X-Current-Page', data.page);
    // res.setHeader('Link', generateLinkHeader(data));
    res.setHeader('Access-Control-Expose-Headers', [
        'X-Total-Count',
        'X-Total-Page',
        'X-Item-Count',
        'X-Item-Per-Page',
        'X-Current-Page',
        // 'Link',
    ]);
}
