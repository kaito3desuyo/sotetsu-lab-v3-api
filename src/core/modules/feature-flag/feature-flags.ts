import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeatureFlagModel } from './feature-flag.model.js';

/** Lambda の 1 実体の中でフラグを覚えておく時間。切り替えが効くまで最大これだけかかる */
export const FEATURE_FLAG_TTL_MS = 60_000;

type Loaded = { flags: Map<string, boolean>; loadedAt: number };

@Injectable()
export class FeatureFlags {
    #cache: Loaded | undefined;
    #loading: Promise<Loaded> | undefined;

    constructor(
        @InjectRepository(FeatureFlagModel)
        private readonly repository: Repository<FeatureFlagModel>,
    ) {}

    /** 行が無いキーは false。DB を読めなければ例外をそのまま投げる */
    async isEnabled(key: string): Promise<boolean> {
        const { flags } = await this.#load();
        return flags.get(key) ?? false;
    }

    async all(): Promise<Record<string, boolean>> {
        const { flags } = await this.#load();
        return Object.fromEntries(flags);
    }

    async #load(): Promise<Loaded> {
        if (
            this.#cache &&
            Date.now() - this.#cache.loadedAt < FEATURE_FLAG_TTL_MS
        ) {
            return this.#cache;
        }
        // 同時に来た読み込みは 1 本の Promise を共有する。失敗は覚えない
        this.#loading ??= this.#fetch().finally(() => {
            this.#loading = undefined;
        });
        return this.#loading;
    }

    async #fetch(): Promise<Loaded> {
        const rows = await this.repository
            .createQueryBuilder('f')
            .select(['f.key', 'f.enabled'])
            .getMany();
        this.#cache = {
            flags: new Map(rows.map((row) => [row.key, row.enabled])),
            loadedAt: Date.now(),
        };
        return this.#cache;
    }
}
