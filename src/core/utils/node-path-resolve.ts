import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

type ResolveContext = { parentURL?: string };
type NextResolve<C, R> = (specifier: string, context: C) => R;

const isRelativeOrAbsolute = (specifier: string) =>
    /^(\.{1,2}\/|\/|file:|node:|data:)/.test(specifier);

/**
 * ESM の import は NODE_PATH を見ないため、Lambda のレイヤー（/opt/nodejs/node_modules）にある依存を
 * /var/task/dist から解決できない。見つからなかった外部パッケージだけ、NODE_PATH の各ディレクトリから探し直す
 * module.registerHooks の resolve を作る（dist/run.sh で --import する register-node-path.ts から使う）。
 */
export function createNodePathResolve(dirs: string[]) {
    // 「dir/../x.js から import した」ことにすると、Node はその dir（node_modules）を探す
    const parents = dirs.map(
        (dir) => pathToFileURL(join(dir, '..', 'x.js')).href,
    );

    return <C extends ResolveContext, R>(
        specifier: string,
        context: C,
        nextResolve: NextResolve<C, R>,
    ): R => {
        try {
            return nextResolve(specifier, context);
        } catch (error) {
            if (
                (error as { code?: string })?.code !== 'ERR_MODULE_NOT_FOUND' ||
                isRelativeOrAbsolute(specifier)
            ) {
                throw error;
            }
            for (const parentURL of parents) {
                try {
                    return nextResolve(specifier, { ...context, parentURL });
                } catch {
                    // 次のディレクトリを探す
                }
            }
            throw error;
        }
    };
}
