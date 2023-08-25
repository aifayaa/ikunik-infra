import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';

const { COLL_PRESS_AUTOMATION_TASKS } = mongoCollections;

const lambda = new Lambda({
  region: process.env.REGION,
});

function canRun() {
  return (true);
}

export default async () => {
  const client = await MongoClient.connect();
  const now = new Date();

  try {
    const allTasks = client
      .db()
      .collection(COLL_PRESS_AUTOMATION_TASKS)
      .find({
        active: true,
        startDateTime: { $lte: now },
      }, {
        projection: {
          _id: 1,
        },
      });

    const promises = [];
    await allTasks.forEach((task) => {
      if (canRun(task, now)) {
        promises.push(lambda.invokeAsync({
          FunctionName: `pressAutomation-${process.env.STAGE}-singleTaskRunner`,
          InvokeArgs: JSON.stringify({
            taskId: task._id,
          }),
        }).promise());
      }
    });

    if (promises.length > 0) {
      await Promise.all(promises);
    }

    return (promises.length);
  } finally {
    client.close();
  }
};
