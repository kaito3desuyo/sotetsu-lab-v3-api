import {
    InvokeCommand,
    LambdaClient,
    type LambdaClientConfig,
} from '@aws-sdk/client-lambda';
import { Injectable, Logger, Optional } from '@nestjs/common';

export type SocketSignalType = 'sighting' | 'timetable';

/**
 * 合図は書き込みの応答の前に await される（api Lambda の timeout は 3 秒）。
 * 詰まった Invoke が書き込み済みの応答を 504 にしないよう、再試行なし・接続 300ms・応答 1 秒で打ち切る。
 * requestTimeout は throwOnRequestTimeout を付けないと警告ログだけで打ち切られない。
 */
export const SOCKET_SIGNAL_CLIENT_CONFIG = {
    maxAttempts: 1,
    requestHandler: {
        connectionTimeout: 300,
        requestTimeout: 1000,
        throwOnRequestTimeout: true,
    },
} as const satisfies LambdaClientConfig;

/**
 * 書き込みに成功したことを、socket の broadcast 関数に知らせる。
 * 待たずに頼むだけ（InvocationType: Event）。失敗しても書き込みは成功のまま返したいので、例外を投げずにログだけ残す。
 * 関数名が無い（ローカル・テスト）なら何もしない。
 */
@Injectable()
export class SocketSignal {
    readonly #logger = new Logger(SocketSignal.name);
    readonly #client: LambdaClient;

    constructor(@Optional() client?: LambdaClient) {
        this.#client = client ?? new LambdaClient(SOCKET_SIGNAL_CLIENT_CONFIG);
    }

    async send(params: { type: SocketSignalType }): Promise<void> {
        const functionName = process.env.SOCKET_BROADCAST_FUNCTION_NAME;
        if (!functionName) {
            return;
        }

        try {
            await this.#client.send(
                new InvokeCommand({
                    FunctionName: functionName,
                    InvocationType: 'Event',
                    Payload: Buffer.from(JSON.stringify({ type: params.type })),
                }),
            );
        } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            this.#logger.warn(
                `socket への合図に失敗しました: ${error.name} ${error.message}`,
            );
        }
    }
}
