export class ModerationInvalidateSightingsResultDto {
    invalidated!: string[];
    skipped!: { id: string; reason: 'not_found' | 'already_invalidated' }[];
    /** 予期しない例外で止まった目撃。止まらなければ null */
    failed!: { id: string; message: string } | null;
    /** 時間切れ・失敗で手を付けなかった id（元の順）。全部処理したら空 */
    pending!: string[];
}
