import { SightingAuthorMarks } from './sighting-author-marks.read-model.js';

const HOUR = 60 * 60 * 1000;
const REGISTERED = new Date('2026-11-01T00:00:00.000Z');

const marks = (
    overrides: Partial<Parameters<typeof SightingAuthorMarks.of>[0]> = {},
) =>
    SightingAuthorMarks.of({
        role: 'reporter',
        registeredAt: REGISTERED,
        sightingCreatedAt: new Date(REGISTERED.getTime() + 48 * HOUR),
        recentPostCount: 1,
        ...overrides,
    });

describe('SightingAuthorMarks', () => {
    it('規則の定数: 24 時間・60 分・5 件', () => {
        expect(SightingAuthorMarks.NEW_ACCOUNT_HOURS).toBe(24);
        expect(SightingAuthorMarks.BURST_WINDOW_MINUTES).toBe(60);
        expect(SightingAuthorMarks.BURST_COUNT).toBe(5);
    });

    describe('newAccount（登録から 24 時間未満）', () => {
        const at = (ms: number) => new Date(REGISTERED.getTime() + ms);

        it('登録の直後は newAccount', () => {
            expect(marks({ sightingCreatedAt: at(0) }).newAccount).toBe(true);
        });

        it('24 時間の 1 ミリ秒前は newAccount', () => {
            expect(
                marks({ sightingCreatedAt: at(24 * HOUR - 1) }).newAccount,
            ).toBe(true);
        });

        it('ちょうど 24 時間は newAccount ではない（境目は含めない）', () => {
            expect(marks({ sightingCreatedAt: at(24 * HOUR) }).newAccount).toBe(
                false,
            );
        });

        it('24 時間を過ぎれば newAccount ではない', () => {
            expect(
                marks({ sightingCreatedAt: at(24 * HOUR + 1) }).newAccount,
            ).toBe(false);
        });
    });

    describe('burst（窓の中の投稿が 5 件以上）', () => {
        it.each([
            [0, false],
            [4, false],
            [5, true],
            [6, true],
        ])(
            '投稿 %i 件は burst=%s（ちょうど 5 件で付く）',
            (count, expected) => {
                expect(marks({ recentPostCount: count }).burst).toBe(expected);
            },
        );
    });

    describe('印を付ける役割', () => {
        it.each(['reporter', 'viewer'])('%s には両方の印を付けうる', (role) => {
            expect(
                marks({
                    role,
                    sightingCreatedAt: REGISTERED,
                    recentPostCount: 5,
                }),
            ).toEqual({ newAccount: true, burst: true });
        });

        it.each(['editor', 'manager', 'unknown'])(
            '%s は新しいアカウントで連投しても両方 false',
            (role) => {
                expect(
                    marks({
                        role,
                        sightingCreatedAt: REGISTERED,
                        recentPostCount: 99,
                    }),
                ).toEqual({ newAccount: false, burst: false });
            },
        );
    });

    it('newAccount と burst は独立に決まる', () => {
        expect(
            marks({ sightingCreatedAt: REGISTERED, recentPostCount: 1 }),
        ).toEqual({ newAccount: true, burst: false });
        expect(marks({ recentPostCount: 5 })).toEqual({
            newAccount: false,
            burst: true,
        });
    });
});
