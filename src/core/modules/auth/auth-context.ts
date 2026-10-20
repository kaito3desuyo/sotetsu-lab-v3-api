import { Role } from '../rbac/role.enum';

/** 検証済みトークンから分かった利用者 */
export type AuthContext = {
    userId: string | null;
    role: Role | null;
};
