export class OperationSightingAuthorDto {
    /** 投稿者が記録されていない目撃（ゲスト・2026-10-23 より前）は null */
    userId!: string | null;
}
