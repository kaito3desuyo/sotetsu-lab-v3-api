import { UseCaseError } from '../../../core/classes/custom-error.js';
import { RoleChangeReason } from './role-change-reason.domain.js';

describe('RoleChangeReason', () => {
    it('1 字から 200 字まで受け取る（trim せず入力のまま持つ）', () => {
        expect(RoleChangeReason.create('あ').value).toBe('あ');
        expect(RoleChangeReason.create('あ'.repeat(200)).value).toHaveLength(
            200,
        );
        expect(RoleChangeReason.create(' 荒らし ').value).toBe(' 荒らし ');
    });

    it.each(['', ' ', '\n\t  ', 'あ'.repeat(201)])(
        '%j（空・空白だけ・201 字）は reason_required で、context を添える',
        (value) => {
            try {
                RoleChangeReason.create(value, { userId: 'u-1' });
                throw new Error('投げられなかった');
            } catch (error) {
                expect(error).toBeInstanceOf(UseCaseError);
                expect((error as UseCaseError).context).toEqual({
                    reason: 'reason_required',
                    userId: 'u-1',
                });
            }
        },
    );
});
