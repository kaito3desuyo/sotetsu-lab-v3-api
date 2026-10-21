import { createNodePathResolve } from './node-path-resolve.js';

type Context = { parentURL?: string; conditions: string[] };

const notFound = (specifier: string) =>
    Object.assign(new Error(`Cannot find package '${specifier}'`), {
        code: 'ERR_MODULE_NOT_FOUND',
    });

/** /opt/nodejs/node_modules の下にあるパッケージだけ解決できる nextResolve（Lambda のレイヤーの代わり） */
const nextResolveFor =
    (installedUnder: string, packages: string[]) =>
    (specifier: string, context: Context) => {
        if (
            packages.includes(specifier) &&
            context.parentURL?.startsWith(`file://${installedUnder}/`)
        ) {
            return {
                url: `file://${installedUnder}/node_modules/${specifier}/index.js`,
            };
        }
        throw notFound(specifier);
    };

const appContext: Context = {
    parentURL: 'file:///var/task/dist/app.js',
    conditions: ['node', 'import'],
};

describe('createNodePathResolve', () => {
    const resolve = createNodePathResolve([
        '/opt/nodejs/node24/node_modules',
        '/opt/nodejs/node_modules',
    ]);
    const next = nextResolveFor('/opt/nodejs', ['@nestjs/common']);

    it('アプリから見つからない外部パッケージは NODE_PATH のディレクトリから解決する', () => {
        expect(resolve('@nestjs/common', appContext, next)).toEqual({
            url: 'file:///opt/nodejs/node_modules/@nestjs/common/index.js',
        });
    });

    it('相対パスの import は探し直さず、そのままエラーにする', () => {
        expect(() => resolve('./missing.js', appContext, next)).toThrow(
            "Cannot find package './missing.js'",
        );
    });

    it('どこにも無いパッケージは元のエラーを投げる', () => {
        expect(() => resolve('no-such-package', appContext, next)).toThrow(
            "Cannot find package 'no-such-package'",
        );
    });

    it('見つからない以外のエラーはそのまま投げる', () => {
        const broken = () => {
            throw Object.assign(new Error('bad'), {
                code: 'ERR_INVALID_PACKAGE_CONFIG',
            });
        };
        expect(() => resolve('@nestjs/common', appContext, broken)).toThrow(
            'bad',
        );
    });
});
