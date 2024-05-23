/* eslint-disable import/no-relative-packages */
import https from 'https';
import { Configuration, OpenAIApi } from 'openai';
import Lambda from 'aws-sdk/clients/lambda';
import MongoClient, { ObjectID } from '../../libs/mongoClient.ts';
import mongoCollections from '../../libs/mongoCollections.json';
import queryTypes from './openAI-queryTypes.json';

const lambda = new Lambda({
  region: process.env.REGION,
});

const { COLL_AI_QUERIES } = mongoCollections;

const configuration = new Configuration({
  apiKey: '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',
});

const openai = new OpenAIApi(configuration);

async function callGetUploadUrlLambda(userId, appId, fileSize) {
  const parseLambdaResponse = (response) => {
    const { Payload } = response;
    const { statusCode, body } = JSON.parse(Payload);
    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`Media upload URL generation error : ${body}`);
    }
    const [{ id, url }] = JSON.parse(body);
    return { id, url };
  };

  const lambdaResponse = await lambda
    .invoke({
      FunctionName: `files-${process.env.STAGE}-getUploadUrl`,
      Payload: JSON.stringify({
        requestContext: {
          authorizer: {
            appId,
            principalId: userId,
          },
        },
        body: JSON.stringify({
          files: [
            {
              name: 'ai_picture.webp',
              type: 'image/webp',
              size: fileSize,
            },
          ],
          metadata: {},
        }),
      }),
    })
    .promise();

  return parseLambdaResponse(lambdaResponse);
}

function uploadWebpHttps(fileBuffer, url) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': 'image/webp',
        'Content-Length': fileBuffer.length,
      },
    };
    const req = https.request(url, options, (res) => {
      res.on('error', reject);
      res.on('data', () => {});
      res.on('end', resolve);
    });

    req.on('error', reject);
    req.end(fileBuffer);
  });
}

// Mostly inspired from https://stackoverflow.com/a/34524711
function downloadWebpHttps(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const data = [];
        res
          .on('data', (chunk) => {
            data.push(chunk);
          })
          .on('end', () => {
            resolve(Buffer.concat(data));
          });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

async function processPicture(
  dbQuery,
  queryPartId,
  queryPart,
  { dbQueriesColl }
) {
  const { _id, userId, appId } = dbQuery;

  const { prompt, extraArgs = {} } = queryPart;

  const response = await openai.createImage({
    n: 1,
    size: '1024x1024',
    prompt,
    ...extraArgs,
  });
  if (response.data && response.data.data && response.data.data.length > 0) {
    queryPart.rawResponse = response.data.data;
    await dbQueriesColl.updateOne(
      { _id },
      {
        $set: {
          [`parts.${queryPartId}.rawResponse`]: queryPart.rawResponse,
        },
      }
    );

    const fileBuffer = await downloadWebpHttps(queryPart.rawResponse[0].url);

    const uploadParams = await callGetUploadUrlLambda(
      userId,
      appId,
      fileBuffer.length
    );

    await uploadWebpHttps(fileBuffer, uploadParams.url);

    queryPart.response = uploadParams.id;
    await dbQueriesColl.updateOne(
      { _id },
      {
        $set: {
          [`parts.${queryPartId}.response`]: queryPart.response,
        },
      }
    );
  } else {
    throw new Error('Missing data');
  }

  return queryPart.response;
}

async function processCopy(dbQuery, queryPartId, queryPart, { dbQueriesColl }) {
  const { _id } = dbQuery;

  await dbQueriesColl.updateOne(
    { _id },
    {
      $set: {
        [`parts.${queryPartId}.response`]: queryPart.prompt,
      },
      $unset: {
        error: '',
      },
    }
  );
}

async function processText(dbQuery, queryPartId, queryPart, { dbQueriesColl }) {
  const { _id } = dbQuery;

  const { prompt, extraArgs = {} } = queryPart;

  const badlyEncodedPrompt = prompt.split(/[^a-z0-9-]+/g);

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    temperature: 0.6,
    max_tokens: 4000 - badlyEncodedPrompt.length * 3,
    prompt,
    ...extraArgs,
  });
  if (
    response.data &&
    response.data.choices &&
    response.data.choices.length > 0
  ) {
    queryPart.rawResponse = response.data.choices;
    queryPart.response = response.data.choices[0].text.trim();
    await dbQueriesColl.updateOne(
      { _id },
      {
        $set: {
          [`parts.${queryPartId}.rawResponse`]: queryPart.rawResponse,
          [`parts.${queryPartId}.response`]: queryPart.response,
        },
        $unset: {
          error: '',
        },
      }
    );
  } else {
    throw new Error('Missing data');
  }

  return queryPart.response;
}

async function processImagesToIdDownload(
  dbQuery,
  queryPartId,
  queryPart,
  { dbQueriesColl }
) {
  const { prompt } = queryPart;
  const imagesURLs = JSON.parse(prompt);
  const { _id, userId, appId } = dbQuery;

  await new Promise((resolve, reject) => {
    let lastError = null;

    async function tryNextURL() {
      const url = imagesURLs.shift();

      if (url === undefined) {
        reject(lastError || new Error('No URL found'));
        return;
      }

      if (!url) {
        setTimeout(tryNextURL, 0);
        return;
      }

      try {
        const fileBuffer = await downloadWebpHttps(url);

        const uploadParams = await callGetUploadUrlLambda(
          userId,
          appId,
          fileBuffer.length
        );

        await uploadWebpHttps(fileBuffer, uploadParams.url);

        queryPart.response = uploadParams.id;
        await dbQueriesColl.updateOne(
          { _id },
          {
            $set: {
              [`parts.${queryPartId}.response`]: queryPart.response,
            },
          }
        );

        resolve();
      } catch (e) {
        /* Skip error and try next URL */
        lastError = e;

        setTimeout(tryNextURL, 0);
      }
    }

    tryNextURL();
  });
}

/**
 * A function that runs `exec` on each element of the `data` array until the end of it or an error.
 * `exec` is called like with map() : `exec(data[i], i, data)`
 */
export function processDataArray(exec, data) {
  return new Promise((resolve, reject) => {
    let processNext;
    let i = 0;

    const processCurrent = (datum) => {
      exec(datum, i - 1, data)
        .then(processNext)
        .catch(reject);
    };

    processNext = () => {
      if (data.length <= i) {
        resolve();
        return;
      }

      const datum = data[i];
      i += 1;

      processCurrent(datum);
    };

    processNext();
  });
}

export default async function generateContent(queryId) {
  const client = await MongoClient.connect();

  try {
    const dbQueriesColl = client.db().collection(COLL_AI_QUERIES);

    const dbQuery = await dbQueriesColl.findOne({ _id: ObjectID(queryId) });
    if (!dbQuery) {
      throw new Error('cannot_find_query');
    }

    await dbQueriesColl.updateOne(
      { _id: dbQuery._id },
      { $set: { processingStartTime: new Date() } }
    );

    const results = {};
    const processOneQueryPart = async (part, queryPartId) => {
      const { type, field, prompt } = part;

      part.prompt = prompt.replace(/{%([^%]+)%}/g, (match, key) => {
        if (results[key]) {
          return results[key];
        }
        return '';
      });

      if (type === queryTypes.TEXT) {
        results[field] = await processText(dbQuery, queryPartId, part, {
          dbQueriesColl,
        });
      } else if (type === queryTypes.COPY) {
        results[field] = await processCopy(dbQuery, queryPartId, part, {
          dbQueriesColl,
        });
      } else if (type === queryTypes.PICTURE) {
        results[field] = await processPicture(dbQuery, queryPartId, part, {
          dbQueriesColl,
        });
      } else if (type === queryTypes.IMAGES_TO_ID_DOWNLOAD) {
        results[field] = await processImagesToIdDownload(
          dbQuery,
          queryPartId,
          part,
          { dbQueriesColl }
        );
      }
    };

    try {
      await processDataArray(processOneQueryPart, dbQuery.parts);
      const endQuery = {
        $set: { processingEndTime: new Date() },
      };
      if (dbQuery.error) {
        endQuery.$unset = { error: '' };
      }
      await dbQueriesColl.updateOne({ _id: dbQuery._id }, endQuery);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('API Error :', e);
      if (e.response) {
        dbQuery.error = {
          status: e.response.status,
          data: e.response.data,
        };
      } else {
        dbQuery.error = {
          message: e.message,
        };
      }
      await dbQueriesColl.updateOne(
        { _id: dbQuery._id },
        { $set: { error: dbQuery.error, processingEndTime: new Date() } }
      );
    }

    return dbQuery;
  } finally {
    await client.close();
  }
}
