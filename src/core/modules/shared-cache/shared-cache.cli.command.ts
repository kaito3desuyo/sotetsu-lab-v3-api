import { Command, CommandRunner, Option, SubCommand } from 'nest-commander';
import { SharedCache } from './shared-cache.js';

interface InvalidateOptions {
    namespace?: string[];
    tag?: string[];
}

@SubCommand({
    name: 'invalidate',
    description:
        'Invalidate shared cache entries by namespace (--namespace) or tag (--tag)',
})
export class InvalidateSharedCacheCommand extends CommandRunner {
    constructor(private readonly sharedCache: SharedCache) {
        super();
    }

    @Option({
        flags: '--namespace <namespace>',
        description: 'Namespace to invalidate (repeatable)',
    })
    parseNamespace(value: string, previous: string[] = []): string[] {
        return [...previous, value];
    }

    @Option({
        flags: '--tag <tag>',
        description: 'Tag to invalidate (repeatable)',
    })
    parseTag(value: string, previous: string[] = []): string[] {
        return [...previous, value];
    }

    async run(
        _passedParams: string[],
        options?: InvalidateOptions,
    ): Promise<void> {
        // SharedCache はテーブル名が空だと何もせず成功を返すため、ここで止める
        if (!process.env.SHARED_CACHE_TABLE_NAME) {
            console.error(
                'error: SHARED_CACHE_TABLE_NAME is empty; nothing was invalidated.',
            );
            process.exitCode = 1;
            return;
        }

        const namespaces = options?.namespace ?? [];
        const tags = options?.tag ?? [];
        if (namespaces.length === 0 && tags.length === 0) {
            console.error(
                'error: specify at least one --namespace <name> or --tag <tag>.',
            );
            process.exitCode = 1;
            return;
        }

        let ok = true;
        for (const namespace of namespaces) {
            if (await this.sharedCache.invalidateNamespace({ namespace })) {
                console.log(`invalidated namespace: ${namespace}`);
            } else {
                console.error(
                    `error: failed to invalidate namespace: ${namespace}`,
                );
                ok = false;
            }
        }
        if (tags.length > 0) {
            if (await this.sharedCache.invalidate({ tags })) {
                console.log(`invalidated tags: ${tags.join(', ')}`);
            } else {
                console.error(
                    `error: failed to invalidate tags: ${tags.join(', ')}`,
                );
                ok = false;
            }
        }
        if (!ok) {
            process.exitCode = 1;
        }
    }
}

@Command({
    name: 'shared-cache',
    description: 'Shared cache',
    subCommands: [InvalidateSharedCacheCommand],
})
export class SharedCacheCliCommand extends CommandRunner {
    async run(): Promise<void> {
        console.error('error: please use sub commands.');
        process.exitCode = 1;
    }
}
