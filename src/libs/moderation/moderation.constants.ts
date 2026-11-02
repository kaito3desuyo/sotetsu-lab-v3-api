/** 登録してこの時間以内の利用者の目撃に印（newAccount）を付ける */
export const NEW_ACCOUNT_HOURS = 24;
/** 同じ人の投稿がその目撃までの BURST_WINDOW_MINUTES 分にこの件数以上あれば印（burst）を付ける */
export const BURST_COUNT = 5;
export const BURST_WINDOW_MINUTES = 60;

export const SIGHTING_LIST_DEFAULT_LIMIT = 100;
export const SIGHTING_LIST_MAX_LIMIT = 200;

/** まとめての無効化で 1 回に受ける目撃の数の上限・理由の長さの上限 */
export const INVALIDATE_SIGHTINGS_MAX_COUNT = 200;
export const INVALIDATE_REASON_MAX_LENGTH = 200;

/** BAN・解除の理由の長さの上限 */
export const ROLE_CHANGE_REASON_MAX_LENGTH = 200;

/** この数以上のアカウントが同じ手がかり（IP）を使っていたら、携帯回線などの共用とみなして弱めて出す */
export const SHARED_TRACE_ACCOUNT_COUNT = 10;
/** 手がかり 1 件につき並べる「同じ手がかりを使った他のアカウント」の最大数 */
export const TRACE_OTHER_ACCOUNTS_LIMIT = 20;
