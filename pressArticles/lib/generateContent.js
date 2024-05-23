/* eslint-disable import/no-relative-packages */
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { formatMessage, intlInit } from '../../libs/intl/intl';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { COLL_AI_QUERIES } = mongoCollections;

const fieldsList = [
  { field: 'title', type: 'text' },
  { field: 'article', type: 'text' },
  { field: 'articlePicture', type: 'picture' },
];

export const possibleFields = fieldsList.map(({ field }) => field);

export async function generateContent(userPrompts, lang, { appId, userId }) {
  const client = await MongoClient.connect();

  try {
    intlInit(lang);

    const query = {
      appId,
      userId,
      parts: fieldsList.map(({ field, type }) => {
        const tsKey = userPrompts[field] ? 'custom' : 'generic';
        const aiPrompt = formatMessage(
          `pressArticles:generateContent.${tsKey}.${field}`,
          {
            userPrompt: (userPrompts && userPrompts[field]) || '',
          }
        );

        return {
          field,
          prompt: aiPrompt,
          type,
        };
      }),
    };

    const insertResult = await client
      .db()
      .collection(COLL_AI_QUERIES)
      .insertOne(query);

    const { insertedId } = insertResult;

    await lambda
      .invokeAsync({
        FunctionName: `ai-${process.env.STAGE}-OpenAI-GenerateContent`,
        InvokeArgs: JSON.stringify({
          queryId: insertedId,
        }),
      })
      .promise();

    return insertedId;
  } finally {
    await client.close();
  }
}
