/** 役割の書き換え 1 件。profiles.role の更新と user_role_changes の行はこれから作る */
export type UserRoleChange = {
    userId: string;
    changedBy: string;
    fromRole: string;
    toRole: string;
    reason: string | null;
};
