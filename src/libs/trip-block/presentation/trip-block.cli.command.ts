import { Command, CommandRunner, SubCommand } from 'nest-commander';

@SubCommand({
    name: 'copy-trip-blocks',
    description: 'Copy Trip Blocks',
    arguments: '<fromCalendarId> <toCalendarId>',
})
export class CopyTripBlocksCommand implements CommandRunner {
    run(passedParams: string[], options?: Record<string, any>): Promise<void> {
        throw new Error('Method not implemented.');
    }
}

@Command({
    name: 'trip-block',
    description: 'Trip Block',
    subCommands: [CopyTripBlocksCommand],
    options: {},
})
export class TripBlockCommand implements CommandRunner {
    async run(): Promise<void> {
        console.error('error: please use sub commands.');
        process.exitCode = 1;
    }
}
