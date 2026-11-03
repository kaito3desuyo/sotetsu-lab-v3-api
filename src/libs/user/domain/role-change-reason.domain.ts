import { UseCaseError } from '../../../core/classes/custom-error.js';
import { ValueObject } from '../../../core/classes/value-object.js';
import { ROLE_CHANGE_REASON_MAX_LENGTH } from '../user.constants.js';

type RoleChangeReasonProps = {
    value: string;
};

/**
 * BAN・解除の理由。空白だけは不可・ROLE_CHANGE_REASON_MAX_LENGTH 字まで。
 * 値は trim しない（入力のまま記録する）。解除の理由は省略できるので、無いときは null を持つ側で表す
 */
export class RoleChangeReason extends ValueObject<RoleChangeReasonProps> {
    private constructor(props: RoleChangeReasonProps) {
        super(props);
    }

    /** context は UseCaseError の context に足す（例: 対象の userId） */
    static create(
        value: string,
        context: Record<string, unknown> = {},
    ): RoleChangeReason {
        if (
            value.trim().length < 1 ||
            value.length > ROLE_CHANGE_REASON_MAX_LENGTH
        ) {
            throw new UseCaseError(
                `理由は 1〜${ROLE_CHANGE_REASON_MAX_LENGTH} 字で入力してください`,
                { reason: 'reason_required', ...context },
            );
        }

        return new RoleChangeReason({ value });
    }

    get value(): string {
        return this.props.value;
    }
}
