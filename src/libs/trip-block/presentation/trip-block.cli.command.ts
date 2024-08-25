import { Command, CommandRunner, SubCommand } from 'nest-commander';
import { TripBlockCliService } from '../usecase/trip-block.cli.service';

@SubCommand({
    name: 'copy-trip-blocks',
    description: 'Copy Trip Blocks',
    arguments: '<fromCalendarId> <toCalendarId>',
})
export class CopyTripBlocksCommand extends CommandRunner {
    constructor(private readonly tripBlockCliService: TripBlockCliService) {
        super();
    }

    async run(
        [fromCalendarId, toCalendarId]: [string, string],
        options?: Record<string, any>,
    ): Promise<void> {
        await this.tripBlockCliService.copyTripBlocks(
            fromCalendarId,
            toCalendarId,
        );
    }
}

@Command({
    name: 'trip-block',
    description: 'Trip Block',
    subCommands: [CopyTripBlocksCommand],
    options: {},
})
export class TripBlockCommand extends CommandRunner {
    async run(): Promise<void> {
        console.error('error: please use sub commands.');
        process.exitCode = 1;
    }
}
