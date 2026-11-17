import { ItinerarySegment } from '../../operation/domain/itinerary-link-rule.domain.js';
import { TransferStart } from './transfer-start.js';

const t = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 3600 + m * 60;
};

const seg = (
    id: string,
    operationNumber: string,
    p: Partial<ItinerarySegment> = {},
): ItinerarySegment => ({
    id,
    tripId: `trip-${id}`,
    tripBlockId: `block-${id}`,
    operationId: `op-${operationNumber}`,
    operationNumber,
    startStationId: 'X',
    endStationId: 'Y',
    startSeconds: 0,
    endSeconds: 0,
    nextTripOperationListId: null,
    ...p,
});

describe('TransferStart.find', () => {
    it('決まり 2（次の区間）で前の運用からつながる → 前の運用番号と到着の秒', () => {
        const segments = [
            seg('a', '11K', {
                startSeconds: t('07:30'),
                endSeconds: t('08:22'),
                nextTripOperationListId: 'b',
            }),
            seg('b', '12K', {
                startSeconds: t('08:30'),
                endSeconds: t('09:30'),
            }),
        ];
        expect(TransferStart.find(segments, 'op-12K')).toEqual({
            previousOperationNumber: '11K',
            arrivalSeconds: t('08:22'),
        });
    });

    it('決まり 1（同じ列車のまとまりの途中で運番が変わる）でも返す', () => {
        const segments = [
            seg('a', '11K', {
                tripBlockId: 'blk',
                startStationId: 'S1',
                endStationId: 'S2',
                startSeconds: t('08:00'),
                endSeconds: t('08:22'),
            }),
            seg('b', '12K', {
                tripBlockId: 'blk',
                startStationId: 'S2',
                endStationId: 'S3',
                startSeconds: t('08:22'),
                endSeconds: t('09:00'),
            }),
        ];
        expect(TransferStart.find(segments, 'op-12K')).toEqual({
            previousOperationNumber: '11K',
            arrivalSeconds: t('08:22'),
        });
    });

    it('前が同じ運用番号なら null（運用の 2 つ目以降の区間は見ない）', () => {
        const segments = [
            seg('a', '12K', {
                startSeconds: t('08:00'),
                endSeconds: t('08:20'),
            }),
            seg('b', '12K', {
                startSeconds: t('08:30'),
                endSeconds: t('09:00'),
            }),
        ];
        expect(TransferStart.find(segments, 'op-12K')).toBeNull();
    });

    it('前が無い（出庫で始まる）なら null', () => {
        const segments = [
            seg('b', '12K', {
                startSeconds: t('08:30'),
                endSeconds: t('09:00'),
            }),
            seg('x', '11K', {
                startSeconds: t('07:00'),
                endSeconds: t('07:30'),
            }),
        ];
        expect(TransferStart.find(segments, 'op-12K')).toBeNull();
    });

    it('運用の 2 つ目以降の区間に別の運用がつながっていても、最初の区間につながっていなければ null', () => {
        const segments = [
            seg('a', '12K', {
                startSeconds: t('08:00'),
                endSeconds: t('08:20'),
            }),
            seg('c', '11K', {
                startSeconds: t('08:30'),
                endSeconds: t('08:50'),
                nextTripOperationListId: 'b',
            }),
            seg('b', '12K', {
                startSeconds: t('09:00'),
                endSeconds: t('09:30'),
            }),
        ];
        expect(TransferStart.find(segments, 'op-12K')).toBeNull();
    });

    it('運用の区間が無ければ null', () => {
        expect(TransferStart.find([], 'op-12K')).toBeNull();
    });
});
