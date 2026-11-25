import { SHARED_CACHE_INVALIDATE_FAILED_MESSAGE } from './src/core/modules/shared-cache/shared-cache.log.js';
import {
    ALARM_TOPIC_ARN,
    lambdaAlarms,
    logMetricAlarms,
} from './serverless-alarms.js';

describe('serverless-alarms', () => {
    it('lambdaAlarms は Errors / Url5xxCount のアラームを組み立てる', () => {
        const result = lambdaAlarms([
            {
                logicalId: 'ErrAlarm',
                alarmName: 'n1',
                description: 'd1',
                functionLogicalId: 'AppLambdaFunction',
                metricName: 'Errors',
                threshold: 3,
            },
            {
                logicalId: 'Url5xxAlarm',
                alarmName: 'n2',
                description: 'd2',
                functionLogicalId: 'AppLambdaFunction',
                metricName: 'Url5xxCount',
                threshold: 5,
            },
        ]);
        expect(result.Conditions).toEqual({
            IsProd: { 'Fn::Equals': ['${sls:stage}', 'prod'] },
        });
        expect(result.Resources).toEqual({
            ErrAlarm: {
                Type: 'AWS::CloudWatch::Alarm',
                Condition: 'IsProd',
                Properties: {
                    AlarmName: 'n1',
                    AlarmDescription: 'd1',
                    Namespace: 'AWS/Lambda',
                    MetricName: 'Errors',
                    Dimensions: [
                        {
                            Name: 'FunctionName',
                            Value: { Ref: 'AppLambdaFunction' },
                        },
                    ],
                    Statistic: 'Sum',
                    Period: 3600,
                    EvaluationPeriods: 1,
                    Threshold: 3,
                    ComparisonOperator: 'GreaterThanOrEqualToThreshold',
                    TreatMissingData: 'notBreaching',
                    AlarmActions: [ALARM_TOPIC_ARN],
                    OKActions: [ALARM_TOPIC_ARN],
                },
            },
            Url5xxAlarm: {
                Type: 'AWS::CloudWatch::Alarm',
                Condition: 'IsProd',
                Properties: {
                    AlarmName: 'n2',
                    AlarmDescription: 'd2',
                    Namespace: 'AWS/Lambda',
                    MetricName: 'Url5xxCount',
                    Dimensions: [
                        {
                            Name: 'FunctionName',
                            Value: { Ref: 'AppLambdaFunction' },
                        },
                    ],
                    Statistic: 'Sum',
                    Period: 3600,
                    EvaluationPeriods: 1,
                    Threshold: 5,
                    ComparisonOperator: 'GreaterThanOrEqualToThreshold',
                    TreatMissingData: 'notBreaching',
                    AlarmActions: [ALARM_TOPIC_ARN],
                    OKActions: [ALARM_TOPIC_ARN],
                },
            },
        });
    });

    it('通知先は monitoring の SSM を指す', () => {
        expect(ALARM_TOPIC_ARN).toBe(
            "${ssm:sotetsu-lab-v3-${sls:stage}-monitoring-alarm-topic-arn, ''}",
        );
    });

    it('logMetricAlarms は MetricFilter とアラームを組み立てる', () => {
        const result = logMetricAlarms([
            {
                logicalIdPrefix: 'SharedCacheInvalidateFailed',
                alarmName: 'name',
                description: 'desc',
                logGroupLogicalId: 'AppLogGroup',
                filterPattern: `{ $.message = "${SHARED_CACHE_INVALIDATE_FAILED_MESSAGE}*" }`,
                metricNamespace: 'sotetsu-lab-v3/api',
                metricName: 'SharedCacheInvalidateFailed',
                threshold: 1,
            },
        ]);
        expect(result).toEqual({
            SharedCacheInvalidateFailedMetricFilter: {
                Type: 'AWS::Logs::MetricFilter',
                Condition: 'IsProd',
                DependsOn: ['AppLogGroup'],
                Properties: {
                    LogGroupName: { Ref: 'AppLogGroup' },
                    FilterPattern:
                        '{ $.message = "共有キャッシュの破棄に失敗しました*" }',
                    MetricTransformations: [
                        {
                            MetricNamespace: 'sotetsu-lab-v3/api',
                            MetricName: 'SharedCacheInvalidateFailed',
                            MetricValue: '1',
                            Unit: 'Count',
                        },
                    ],
                },
            },
            SharedCacheInvalidateFailedAlarm: {
                Type: 'AWS::CloudWatch::Alarm',
                Condition: 'IsProd',
                Properties: {
                    AlarmName: 'name',
                    AlarmDescription: 'desc',
                    Namespace: 'sotetsu-lab-v3/api',
                    MetricName: 'SharedCacheInvalidateFailed',
                    Statistic: 'Sum',
                    Period: 3600,
                    EvaluationPeriods: 1,
                    Threshold: 1,
                    ComparisonOperator: 'GreaterThanOrEqualToThreshold',
                    TreatMissingData: 'notBreaching',
                    AlarmActions: [ALARM_TOPIC_ARN],
                    OKActions: [ALARM_TOPIC_ARN],
                },
            },
        });
    });
});
