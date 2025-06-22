import {
  CreateStateMachineCommand,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';

const {
  MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME,
  MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE,
  MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE,
  REGION,
  STAGE,
} = process.env as {
  MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME: string;
  MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE: string;
  MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE: string;
  REGION: string;
  STAGE: string;
};

const sfnClient = new SFNClient({
  region: REGION,
});

export default async () => {
  const stateMachineParams = new CreateStateMachineCommand({
    name: MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_NAME,
    roleArn: MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_ROLE,
    type: 'STANDARD',
    definition: JSON.stringify(
      {
        Comment:
          'Ghanty MyFid daily notification planner for ghanty offers & points system',
        StartAt: 'callLambda',
        States: {
          callLambda: {
            Type: 'Task',
            Resource: 'arn:aws:states:::lambda:invoke',
            Parameters: {
              FunctionName: MYFID_NOTIFICATIONS_PLANNING_STATE_MACHINE_RESOURCE,
              'Payload.$': '$',
            },
            Retry: [
              {
                ErrorEquals: [
                  'Lambda.ServiceException',
                  'Lambda.AWSLambdaException',
                  'Lambda.SdkClientException',
                ],
                IntervalSeconds: 2,
                MaxAttempts: 6,
                BackoffRate: 2,
              },
            ],
            Next: 'choice',
            ResultPath: '$.lastExec',
          },
          choice: {
            Type: 'Choice',
            Choices: [
              {
                Variable: '$.lastExec.Payload.retry',
                BooleanEquals: true,
                Next: 'callLambda',
              },
            ],
            Default: 'Success',
          },
          Success: {
            Type: 'Succeed',
          },
        },
      },
      null,
      2
    ) /** < Formatting because it can be read on the amazon web interface */,
  });

  const { stateMachineArn } = await sfnClient.send(stateMachineParams);

  const execParams = new StartExecutionCommand({
    stateMachineArn,
    name: `${STAGE}-${Date.now()}`,
    input: JSON.stringify({
      offset: 0,
    }),
  });

  const { executionArn } = await sfnClient.send(execParams);

  console.log('VERBOSE executionArn', executionArn);
};
