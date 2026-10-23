import { SetMetadata } from '@nestjs/common';

export const RBAC_WHEN_FLAG_KEY = 'rbac-when-flag';
/** フラグが on のときだけ @RBAC を効かせる。off なら役割を見ずに通す（トークンの検証は AuthGuard が行う） */
export const RBACWhenFlag = (key: string) =>
    SetMetadata(RBAC_WHEN_FLAG_KEY, key);
