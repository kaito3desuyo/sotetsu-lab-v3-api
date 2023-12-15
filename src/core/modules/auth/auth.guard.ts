import {
    CanActivate,
    ExecutionContext,
    Injectable,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USERPOOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    tokenUse: 'access',
});

@Injectable()
export class AuthGuard implements CanActivate {
    readonly #logger = new Logger(AuthGuard.name);

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const req = context.switchToHttp().getRequest();
            const jwt = (req.headers.authorization ?? '').replace(
                'Bearer ',
                '',
            );
            const payload = await verifier.verify(jwt);
            req.cognito_jwt_payload = payload;

            return true;
        } catch (e) {
            this.#logger.error(e.message, e.stack);
            throw new UnauthorizedException();
        }
    }
}
