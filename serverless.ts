import type { AWS } from '@serverless/typescript';

const system = 'sotetsu-lab-v3' as const;

const serverlessConfiguration: AWS = {
    service: `${system}-api`,
    frameworkVersion: '3',
    plugins: ['serverless-deployment-bucket', 'serverless-layers'],
    provider: {
        name: 'aws',
        stage: 'prod',
        region: 'ap-northeast-1',
        runtime: 'nodejs18.x',
        architecture: 'arm64',
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
        // httpApi: {
        //     name: '${param:prefix}-apigw',
        // },
        iam: {
            role: {
                name: '${param:prefix}-lambda-role',
            },
        },
        environment: {
            // HOME: '/tmp',
            TZ: 'Asia/Tokyo',
            NODE_ENV: 'production',
            CORS_HEADER_ORIGIN: 'https://v3.sotetsu-lab.com',
            DATABASE_URL:
                'postgresql://${self:custom.databaseSecrets.username}:${self:custom.databaseSecrets.password}@${ssm:sotetsu-lab-v3-database-rds-proxy-host-param}/sotetsu_lab_v3',
            COGNITO_USERPOOL_ID:
                '${ssm:sotetsu-lab-v3-auth-cognito-userpool-id}',
        },
    },
    // import the function via paths
    functions: {
        // app: {
        //     name: '${param:prefix}-lambda',
        //     url: true,
        //     image: {
        //         name: 'app',
        //     },
        //     memorySize: 1769,
        //     timeout: 25,
        //     // reservedConcurrency: 1000,
        //     environment: {
        //         HOME: '/tmp',
        //         NODE_ENV: 'production',
        //         CORS_HEADER_ORIGIN: 'https://v3.sotetsu-lab.com',
        //         DATABASE_URL:
        //             'postgresql://${self:custom.databaseSecrets.username}:${self:custom.databaseSecrets.password}@${ssm:sotetsu-lab-v3-database-rds-proxy-host-param}/sotetsu_lab_v3',
        //         COGNITO_USERPOOL_ID:
        //             '${ssm:sotetsu-lab-v3-auth-cognito-userpool-id}',
        //     },
        //     events: [
        //         // {
        //         //     httpApi: '*',
        //         // },
        //     ],
        // },
        app: {
            handler: `dist/handler.main`,
            name: '${param:prefix}-lambda',
            memorySize: 1769,
            timeout: 60,
            url: true,
            package: {
                patterns: ['!**', 'dist/**'],
            },
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
    resources: {
        Resources: {
            AppCloudFrontDistribution: {
                Type: 'AWS::CloudFront::Distribution',
                Properties: {
                    DistributionConfig: {
                        Enabled: true,
                        HttpVersion: 'http2and3',
                        Aliases: ['api.sotetsu-lab.com'],
                        ViewerCertificate: {
                            AcmCertificateArn:
                                'arn:aws:acm:us-east-1:442730633672:certificate/1c93cef5-5e62-4b35-a5ac-321040f3ff1b',
                            MinimumProtocolVersion: 'TLSv1.2_2021',
                            SslSupportMethod: 'sni-only',
                        },
                        Origins: [
                            {
                                Id: 'Sotetsu Lab v3 API Lambda Function URL',
                                DomainName: {
                                    'Fn::Join': [
                                        '',
                                        {
                                            'Fn::Split': [
                                                '/',
                                                {
                                                    'Fn::Join': [
                                                        '',
                                                        {
                                                            'Fn::Split': [
                                                                'https://',
                                                                {
                                                                    'Fn::GetAtt': [
                                                                        'AppLambdaFunctionUrl',
                                                                        'FunctionUrl',
                                                                    ],
                                                                },
                                                            ],
                                                        },
                                                    ],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                CustomOriginConfig: {
                                    OriginProtocolPolicy: 'https-only',
                                    OriginSSLProtocols: ['TLSv1.2'],
                                },
                            },
                        ],
                        DefaultCacheBehavior: {
                            TargetOriginId:
                                'Sotetsu Lab v3 API Lambda Function URL',
                            CachePolicyId: { Ref: 'AppCloudFrontCachePolicy' },
                            OriginRequestPolicyId:
                                'b689b0a8-53d0-40ab-baf2-68738e2966ac',
                            ResponseHeadersPolicyId:
                                'eaab4381-ed33-4a86-88ca-d9558dc6cd63',
                            ViewerProtocolPolicy: 'redirect-to-https',
                            AllowedMethods: [
                                'GET',
                                'HEAD',
                                'OPTIONS',
                                'PUT',
                                'POST',
                                'PATCH',
                                'DELETE',
                            ],
                            Compress: true,
                        },
                    },
                },
            },
            AppCloudFrontCachePolicy: {
                Type: 'AWS::CloudFront::CachePolicy',
                Properties: {
                    CachePolicyConfig: {
                        Name: 'Sotetsu_Lab_v3_API_CloudFront_Cache_Policy',
                        DefaultTTL: 1,
                        MaxTTL: 31536000,
                        MinTTL: 1,
                        ParametersInCacheKeyAndForwardedToOrigin: {
                            HeadersConfig: {
                                HeaderBehavior: 'none',
                            },
                            CookiesConfig: {
                                CookieBehavior: 'none',
                            },
                            QueryStringsConfig: {
                                QueryStringBehavior: 'all',
                            },
                            EnableAcceptEncodingGzip: true,
                            EnableAcceptEncodingBrotli: true,
                        },
                    },
                },
            },
        },
    },
};

module.exports = serverlessConfiguration;
