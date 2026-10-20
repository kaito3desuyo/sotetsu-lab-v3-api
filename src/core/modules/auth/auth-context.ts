import { Role } from '../rbac/role.enum';

/** 検証済みトークンから分かった利用者。Cognito の共有トークン（切り替えの途中だけ）は userId が無い */
export type AuthContext = {
    userId: string | null;
    role: Role | null;
};
