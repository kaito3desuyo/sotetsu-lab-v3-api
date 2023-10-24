import type { AWS } from '@serverless/typescript';

const system = 'sotetsu-lab-v3' as const;

const serverlessConfiguration: AWS = {
    service: `${system}-api`,
    frameworkVersion: '3',
    plugins: ['serverless-deployment-bucket'],
    provider: {
        name: 'aws',
        stage: 'prod',
        region: 'ap-northeast-1',
        stackName: '${param:prefix}-cfstack',
        stackTags: {
            System: system,
            Stage: '${sls:stage}',
            Serverless: 'true',
        },
        deploymentBucket: {
            name: '${param:prefix}-sls-deployment-bucket',
            serverSideEncryption: 'AES256',
        },
        vpc: {
            subnetIds: {
                'Fn::Split': [
                    ',',
                    '${ssm:sotetsu-lab-v3-api-subnet-ids-param}',
                ],
            },
            securityGroupIds: [
                '${ssm:sotetsu-lab-v3-api-security-group-id-param}',
            ],
        },
        ecr: {
            images: {
                app: {
                    path: '.',
                    file: 'Dockerfile',
                    platform: 'linux/amd64',
                },
            },
        },
        httpApi: {
            name: '${param:prefix}-apigw',
        },
        iam: {
            role: {
                name: '${param:prefix}-lambda-role',
            },
        },
    },
    // import the function via paths
    functions: {
        app: {
            name: '${param:prefix}-lambda',
            image: {
                name: 'app',
            },
            memorySize: 1769,
            timeout: 25,
            // reservedConcurrency: 1000,
            environment: {
                HOME: '/tmp',
                NODE_ENV: 'production',
                CORS_HEADER_ORIGIN: 'https://v3.sotetsu-lab.com',
                DATABASE_URL:
                    'postgresql://${self:custom.databaseSecrets.username}:${self:custom.databaseSecrets.password}@${ssm:sotetsu-lab-v3-database-rds-proxy-host-param}/sotetsu_lab_v3',
                COGNITO_USERPOOL_ID:
                    '${ssm:sotetsu-lab-v3-auth-cognito-userpool-id}',
            },
            events: [
                {
                    httpApi: '*',
                },
            ],
        },
    },
    package: { individually: true },
    params: {
        default: {
            prefix: `${system}-\${sls:stage}-api`,
        },
    },
    custom: {
        databaseSecrets:
            '${ssm:/aws/reference/secretsmanager/sotetsu-lab-v3-database-rds-secrets}',
        deploymentBucket: {
            blockPublicAccess: true,
        },
    },
};

module.exports = serverlessConfiguration;
