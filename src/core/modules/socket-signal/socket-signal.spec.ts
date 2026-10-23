import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import {
    SOCKET_SIGNAL_CLIENT_CONFIG,
    SocketSignal,
} from './socket-signal.js';

describe('SocketSignal', () => {
    const send = vi.fn();
    const client = { send } as unknown as LambdaClient;
    const ORIGINAL = process.env.SOCKET_BROADCAST_FUNCTION_NAME;

    beforeEach(() => {
        send.mockReset();
        process.env.SOCKET_BROADCAST_FUNCTION_NAME = 'broadcast-fn';
    });

    afterAll(() => {
        process.env.SOCKET_BROADCAST_FUNCTION_NAME = ORIGINAL;
    });

    it('関数を Event で呼び、type だけを送る', async () => {
        send.mockResolvedValue({ StatusCode: 202 });
        await new SocketSignal(client).send({ type: 'sighting' });

        expect(send).toHaveBeenCalledTimes(1);
        const command = send.mock.calls[0][0] as InvokeCommand;
        expect(command.input.FunctionName).toBe('broadcast-fn');
        expect(command.input.InvocationType).toBe('Event');
        expect(
            JSON.parse(
                Buffer.from(command.input.Payload as Uint8Array).toString(),
            ),
        ).toEqual({ type: 'sighting' });
    });

    it('関数名が空なら呼ばない', async () => {
        process.env.SOCKET_BROADCAST_FUNCTION_NAME = '';
        await new SocketSignal(client).send({ type: 'timetable' });
        expect(send).not.toHaveBeenCalled();
    });

    it('呼び出しが失敗しても例外を投げない', async () => {
        send.mockRejectedValue(new Error('AccessDenied'));
        await expect(
            new SocketSignal(client).send({ type: 'sighting' }),
        ).resolves.toBeUndefined();
    });

    it('既定のクライアントは再試行せず、接続 300ms・応答 1 秒で打ち切る', async () => {
        expect(SOCKET_SIGNAL_CLIENT_CONFIG).toEqual({
            maxAttempts: 1,
            requestHandler: {
                connectionTimeout: 300,
                requestTimeout: 1000,
                throwOnRequestTimeout: true,
            },
        });
        const built = new LambdaClient({
            ...SOCKET_SIGNAL_CLIENT_CONFIG,
            region: 'ap-northeast-1',
        });
        await expect(built.config.maxAttempts()).resolves.toBe(1);
    });
});
