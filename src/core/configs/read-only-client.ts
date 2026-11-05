import pg from 'pg';

export const READ_ONLY_SQL = 'SET default_transaction_read_only = on';

/**
 * 接続のたびに default_transaction_read_only を on にする pg の Client。
 * Supabase の pooler（:6543 / :5432 のどちらも）は接続の options（startup parameter）を黙って捨てるので、
 * 接続直後の SET で読み取り専用にする。pg-pool は extra.Client の Client で接続を作り、
 * connect の完了を待ってから使わせるので、SET より前に問い合わせが走ることは無い。
 */
export class ReadOnlyClient extends pg.Client {
    override connect(): Promise<this>;
    override connect(
        callback: (err: Error | null, client?: this) => void,
    ): void;
    override connect(
        callback?: (err: Error | null, client?: this) => void,
    ): Promise<this> | void {
        if (!callback) {
            return super
                .connect()
                .then(() => this.query(READ_ONLY_SQL))
                .then(() => this);
        }
        super.connect((err: Error | null) => {
            if (err) {
                callback(err);
                return;
            }
            this.query(READ_ONLY_SQL, (setErr: Error | null) => {
                if (setErr) {
                    callback(setErr);
                    return;
                }
                callback(null, this);
            });
        });
    }
}
