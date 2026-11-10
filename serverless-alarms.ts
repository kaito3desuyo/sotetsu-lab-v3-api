// Lambda の CloudWatch アラームを組み立てる（api・backend・socket・client で同じ中身）。
// 通知先は monitoring リポがデプロイした SNS トピック（→ Discord）。
export const ALARM_TOPIC_ARN =
    "${ssm:sotetsu-lab-v3-${sls:stage}-monitoring-alarm-topic-arn, ''}";

export interface LambdaAlarm {
    logicalId: string;
    alarmName: string;
    description: string;
    functionLogicalId: string;
    metricName: 'Errors' | 'Url5xxCount';
    threshold: number;
}

export function lambdaAlarms(alarms: LambdaAlarm[]): {
    Conditions: { IsProd: { 'Fn::Equals': ['${sls:stage}', 'prod'] } };
    Resources: Record<string, unknown>;
} {
    const Resources: Record<string, unknown> = {};
    for (const alarm of alarms) {
        Resources[alarm.logicalId] = {
            Type: 'AWS::CloudWatch::Alarm',
            Condition: 'IsProd',
            Properties: {
                AlarmName: alarm.alarmName,
                AlarmDescription: alarm.description,
                Namespace: 'AWS/Lambda',
                MetricName: alarm.metricName,
                Dimensions: [
                    {
                        Name: 'FunctionName',
                        Value: { Ref: alarm.functionLogicalId },
                    },
                ],
                Statistic: 'Sum',
                Period: 3600,
                EvaluationPeriods: 1,
                Threshold: alarm.threshold,
                ComparisonOperator: 'GreaterThanOrEqualToThreshold',
                TreatMissingData: 'notBreaching',
                AlarmActions: [ALARM_TOPIC_ARN],
                OKActions: [ALARM_TOPIC_ARN],
            },
        };
    }
    return {
        Conditions: { IsProd: { 'Fn::Equals': ['${sls:stage}', 'prod'] } },
        Resources,
    };
}
