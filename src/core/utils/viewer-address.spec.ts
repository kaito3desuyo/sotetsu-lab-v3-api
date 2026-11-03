import { parseViewerAddress, readViewerContext } from './viewer-address.js';

describe('parseViewerAddress', () => {
    it('IPv4:port から IP を取り出す', () => {
        expect(parseViewerAddress('198.51.100.10:46532')).toBe('198.51.100.10');
    });

    it('IPv6:port は最後の : より前を IP とする', () => {
        expect(parseViewerAddress('2001:db8::1:46532')).toBe('2001:db8::1');
    });

    it('[IPv6]:port は角括弧を外す', () => {
        expect(parseViewerAddress('[2001:db8::1]:46532')).toBe('2001:db8::1');
    });

    it('未指定・空は null', () => {
        expect(parseViewerAddress(undefined)).toBeNull();
        expect(parseViewerAddress('')).toBeNull();
    });

    it('配列は先頭を使う', () => {
        expect(parseViewerAddress(['203.0.113.24:1', 'x'])).toBe(
            '203.0.113.24',
        );
    });

    it(': が無い・IP として不正なら null', () => {
        expect(parseViewerAddress('198.51.100.10')).toBeNull();
        expect(parseViewerAddress('not-an-ip:80')).toBeNull();
        expect(parseViewerAddress(':80')).toBeNull();
    });
});

describe('readViewerContext', () => {
    it('cloudfront-viewer-address と user-agent を読む', () => {
        const req = {
            headers: {
                'cloudfront-viewer-address': '198.51.100.10:46532',
                'user-agent': 'Mozilla/5.0',
            },
        };
        expect(readViewerContext(req as never)).toEqual({
            ip: '198.51.100.10',
            userAgent: 'Mozilla/5.0',
        });
    });

    it('ヘッダーが無ければ両方 null', () => {
        expect(readViewerContext({ headers: {} } as never)).toEqual({
            ip: null,
            userAgent: null,
        });
    });
});
