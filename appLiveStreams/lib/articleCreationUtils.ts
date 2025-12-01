import https from 'node:https';
import http from 'node:http';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const { REGION, STAGE } = process.env as {
  REGION: string;
  STAGE: string;
};
const lambda = new LambdaClient({
  apiVersion: '2016-06-27',
  region: REGION,
});

export async function callGetUploadUrlLambda(
  userId: string,
  appId: string,
  fileName: string,
  fileSize: number,
  mimeType: string
) {
  const lambdaResponse = await lambda.send(
    new InvokeCommand({
      InvocationType: 'RequestResponse',
      FunctionName: `files-${STAGE}-getUploadUrl`,
      Payload: Buffer.from(
        JSON.stringify({
          requestContext: {
            authorizer: {
              appId,
              principalId: userId,
            },
          },
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            files: [
              {
                name: fileName,
                type: mimeType,
                size: fileSize,
              },
            ],
            metadata: {},
          }),
        })
      ),
    })
  );

  const { Payload } = lambdaResponse;
  if (!Payload) {
    throw new Error(
      `Media upload URL generation error : Missing response payload`
    );
  }

  const { statusCode, body, ...remaining } = JSON.parse(
    Buffer.from(Payload || '').toString('utf8')
  );

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Media upload URL generation error : ${body}`);
  }

  const [{ id, url }] = JSON.parse(body);

  return { id, url };
}

export function uploadWebpHttps(
  fileBuffer: Buffer,
  url: string,
  mimrType: string
) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'PUT',
      headers: {
        'Content-Type': mimrType,
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
export function downloadFileHttps(
  url: string
): Promise<{ body: Buffer; res: http.IncomingMessage }> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const data: Array<Buffer> = [];
        res
          .on('data', (chunk) => {
            data.push(chunk);
          })
          .on('end', () => {
            resolve({ body: Buffer.concat(data), res });
          });
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

export async function uploadImageFromUrl(
  url: string,
  userId: string,
  appId: string
) {
  const { body: fileBuffer, res: httpResponse } = await downloadFileHttps(url);

  const mimeType = httpResponse.headers['content-type'] || 'image/jpeg';

  const { url: imageUploadUrl, id: imageId } = await callGetUploadUrlLambda(
    userId,
    appId,
    url.split('/').pop() as string,
    fileBuffer.length,
    mimeType
  );

  await uploadWebpHttps(fileBuffer, imageUploadUrl, mimeType);

  return imageId;
}

export async function postAALSArticle(
  {
    autoNotify,
    autoPublish,
    categoriesId,
    md,
    pictureId,
    title,
    notificationContent = '',
    notificationTitle = '',
  }: {
    autoNotify: boolean;
    autoPublish: boolean;
    categoriesId: Array<string>;
    md: string;
    pictureId: string;
    title: string;
    notificationContent: string;
    notificationTitle: string;
  },
  { appId, userId }: { appId: string; userId: string }
) {
  const lambdaResponse = await lambda.send(
    new InvokeCommand({
      InvocationType: 'RequestResponse',
      FunctionName: `pressArticles-${process.env.STAGE}-postArticle`,
      Payload: Buffer.from(
        JSON.stringify({
          body: JSON.stringify({
            categoriesId,
            title,
            md,
            pictures: [pictureId],

            actions: [],
            authorName: '',
            feedPicture: '',
            summary: ' ',
            hideFromFeed: false,
            productId: '',
            videos: [],
            mediaCaptions: '',
            displayOptions: {
              fullscreen: true,
              rawContent: true,
            },
          }),
          headers: {
            'content-type': 'application/json',
          },
          queryStringParameters: {
            autoPublish: `${autoPublish}`,
            sendNotifications: `${autoNotify}`,
            notificationContent,
            notificationTitle,
          },
          title,
          requestContext: {
            authorizer: {
              perms: JSON.stringify({ pressArticles_all: true }),
              appId,
              principalId: userId,
            },
          },
        })
      ),
    })
  );

  const { Payload } = lambdaResponse;
  if (!Payload) {
    throw new Error(
      `Media upload URL generation error : Missing response payload`
    );
  }

  const { statusCode, body } = JSON.parse(
    Buffer.from(Payload || '').toString('utf8')
  );
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Media upload URL generation error : ${body}`);
  }

  const { articleId } = JSON.parse(body);

  return articleId;
}
