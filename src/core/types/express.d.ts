import { AuthContext } from '../modules/auth/auth-context';

declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext;
        }
    }
}

export {};
