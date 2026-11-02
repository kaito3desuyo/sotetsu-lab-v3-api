import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OperationSightingV3Service } from '../../operation-sighting/usecase/operation-sighting.v3.service.js';
import { ModerationQuery } from '../infrastructure/queries/moderation.query.js';
import { ModerationV3Service } from './moderation.v3.service.js';

describe('ModerationV3Service', () => {
    let service: ModerationV3Service;
    const query = {
        findUserSummary: vi.fn(),
        findSightingsByUser: vi.fn(),
        findAuthorUserId: vi.fn(),
        findRecentSightings: vi.fn(),
    };

    const operationSighting = { invalidateMany: vi.fn() };

    const sightingRow = {
        operationSightingId: 's-1',
        sightingTime: new Date('2026-11-02T01:00:00.000Z'),
        createdAt: new Date('2026-11-02T01:05:00.000Z'),
        operationNumber: '41',
        formationNumber: '8701',
        invalidated: false,
        invalidatedByUserId: null,
        invalidatedByUsername: null,
    };

    beforeEach(async () => {
        vi.resetAllMocks();
        const module = await Test.createTestingModule({
            providers: [
                ModerationV3Service,
                { provide: ModerationQuery, useValue: query },
                {
                    provide: OperationSightingV3Service,
                    useValue: operationSighting,
                },
            ],
        }).compile();
        service = module.get(ModerationV3Service);
    });

    it('profiles の無い userId の要約は 404（UseCaseError は filter が 422 にするので NotFoundException）', async () => {
        query.findUserSummary.mockResolvedValue(null);
        await expect(
            service.findUserSummary({ userId: 'nobody' }),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
        ['viewer', true],
        ['reporter', false],
        ['editor', false],
    ])('role %s の banned は %s', async (role, banned) => {
        query.findUserSummary.mockResolvedValue({
            userId: 'u-1',
            username: 'alice',
            displayName: 'Alice',
            role,
            createdAt: new Date('2026-10-30T00:00:00.000Z'),
            sightingCount: 0,
            invalidatedCount: 0,
            firstSightingAt: null,
            lastSightingAt: null,
        });
        const result = await service.findUserSummary({ userId: 'u-1' });
        expect(result.banned).toBe(banned);
        expect(result.firstSightingAt).toBeNull();
        expect(result.createdAt).toBe('2026-10-30T00:00:00.000Z');
    });

    it('投稿者の目撃は日時を ISO にし、無効化した人を入れ子で返す', async () => {
        query.findSightingsByUser.mockResolvedValue([
            {
                ...sightingRow,
                invalidated: true,
                invalidatedByUserId: 'e-1',
                invalidatedByUsername: 'editor',
            },
            sightingRow,
        ]);
        const result = await service.findSightingsByUser({
            userId: 'u-1',
            limit: 100,
        });
        expect(result[0]).toEqual({
            operationSightingId: 's-1',
            sightingTime: '2026-11-02T01:00:00.000Z',
            createdAt: '2026-11-02T01:05:00.000Z',
            operationNumber: '41',
            formationNumber: '8701',
            invalidated: true,
            invalidatedBy: { userId: 'e-1', username: 'editor' },
        });
        expect(result[1].invalidatedBy).toBeNull();
        expect(query.findSightingsByUser).toHaveBeenCalledWith({
            userId: 'u-1',
            limit: 100,
            before: null,
        });
    });

    it('before は Date にして query に渡す', async () => {
        query.findSightingsByUser.mockResolvedValue([]);
        await service.findSightingsByUser({
            userId: 'u-1',
            limit: 10,
            before: '2026-11-01T00:00:00.000Z',
        });
        expect(query.findSightingsByUser).toHaveBeenCalledWith({
            userId: 'u-1',
            limit: 10,
            before: new Date('2026-11-01T00:00:00.000Z'),
        });
    });

    it('目撃の投稿者が無ければ userId: null', async () => {
        query.findAuthorUserId.mockResolvedValue(null);
        expect(
            await service.findSightingAuthor({ operationSightingId: 's-1' }),
        ).toEqual({ userId: null });
    });

    it('新着はゲストの目撃の author が null、登録者は印つき', async () => {
        query.findRecentSightings.mockResolvedValue([
            { ...sightingRow, author: null },
            {
                ...sightingRow,
                operationSightingId: 's-2',
                author: {
                    userId: 'u-1',
                    username: 'alice',
                    displayName: 'Alice',
                    role: 'reporter',
                    newAccount: true,
                    burst: false,
                },
            },
        ]);
        const result = await service.findRecentSightings({ limit: 100 });
        expect(result[0].author).toBeNull();
        expect(result[1].author).toEqual({
            userId: 'u-1',
            username: 'alice',
            displayName: 'Alice',
            role: 'reporter',
            newAccount: true,
            burst: false,
        });
    });

    it('invalidateSightings は目撃情報の invalidateMany に任せ、結果をそのまま返す', async () => {
        const result = {
            invalidated: ['a'],
            skipped: [{ id: 'b', reason: 'not_found' as const }],
            failed: null,
            pending: ['c'],
        };
        operationSighting.invalidateMany.mockResolvedValue(result);

        await expect(
            service.invalidateSightings({
                ids: ['a', 'b', 'c'],
                userId: 'e-1',
                reason: '荒らし',
            }),
        ).resolves.toEqual(result);
        expect(operationSighting.invalidateMany).toHaveBeenCalledWith({
            ids: ['a', 'b', 'c'],
            userId: 'e-1',
            reason: '荒らし',
        });
    });
});
