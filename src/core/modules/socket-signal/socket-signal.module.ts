import { Module } from '@nestjs/common';
import { SocketSignal } from './socket-signal.js';

@Module({
    providers: [SocketSignal],
    exports: [SocketSignal],
})
export class SocketSignalModule {}
