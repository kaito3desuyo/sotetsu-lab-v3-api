import { Injectable, Logger } from '@nestjs/common';
import jwt = require('jsonwebtoken');
import jwkToPem = require('jwk-to-pem');
import { find } from 'lodash';

@Injectable()
export class AuthService {
    checkToken(authHeader: string, clientIdHeader: string) {
        // 秘密鍵
        const token = authHeader.split(' ');
        const decoded = jwt.decode(token[1], { complete: true }) as any;

        if (!decoded) {
            Logger.error('Authorization Header is invalid');
            return false;
        }

        // 公開鍵
        const jwkKeys = require('./../../secrets/jwks.json');
        const jwk = find(jwkKeys.keys, obj => obj.kid === decoded.header.kid);
        const pem = jwkToPem(jwk);

        const verify = jwt.verify(token[1], pem, {
            algorithms: ['RS256'],
        }) as any;

        // subがCLIENT_IDと一致していること
        if (verify.sub !== clientIdHeader) {
            // tslint:disable-next-line: no-console
            Logger.error('verify.sub not equal X-APP-CLIENT-ID');
            return false;
        }

        // issがAWS CognitoのユーザープールIDと一致していること
        if (
            verify.iss !==
            'https://cognito-idp.ap-northeast-1.amazonaws.com/' +
                process.env.COGNITO_USERPOOL_ID
        ) {
            Logger.error('verify.iss not equal AWS Cognito userpoolID');
            return false;
        }

        // token_useがaccessになっていること
        if (verify.token_use !== 'access') {
            // tslint:disable-next-line: no-console
            Logger.error('verify.token_use not equal "access"');
            return false;
        }

        return true;
    }
}
