import MongoClient, { ObjectID } from '@libs/mongoClient';
import mongoCollections from '@libs/mongoCollections.json';
import { AppLiveStreamType } from './appLiveStreamTypes';
import { CrowdaaError } from '@libs/httpResponses/CrowdaaError';
import {
  ERROR_TYPE_NOT_ALLOWED,
  ERROR_TYPE_NOT_FOUND,
  LIVE_STREAM_NOT_FOUND_CODE,
  NOT_ENOUGH_PERMISSIONS_CODE,
} from '@libs/httpResponses/errorCodes';
import { CreateChatTokenCommand, IvschatClient } from '@aws-sdk/client-ivschat';
import {
  ALS_CHAT_EXPIRATION_DELAY_MIN,
  checkUserPermissionsOnStream,
} from './utils';

const { IVS_REGION } = process.env as { IVS_REGION: string };

const ivsChatClient = new IvschatClient({
  region: IVS_REGION,
});

type CreateChatTokenParams = {
  appId: string;
  userId: string;
  isAdmin: boolean;
};

const { COLL_APP_LIVE_STREAMS } = mongoCollections;

export async function createChatToken(
  liveStreamId: string,
  { appId, userId, isAdmin }: CreateChatTokenParams
) {
  const client = await MongoClient.connect();

  try {
    const dbLiveStream = (await client
      .db()
      .collection(COLL_APP_LIVE_STREAMS)
      .findOne({ _id: liveStreamId, appId })) as AppLiveStreamType;

    if (!dbLiveStream) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_FOUND,
        LIVE_STREAM_NOT_FOUND_CODE,
        `Cannot find live stream '${liveStreamId}' for app '${appId}'`
      );
    }

    const { canView, previewOnly } = await checkUserPermissionsOnStream(
      dbLiveStream,
      userId
    );

    if (!canView) {
      throw new CrowdaaError(
        ERROR_TYPE_NOT_ALLOWED,
        NOT_ENOUGH_PERMISSIONS_CODE,
        'Not enough permissions to view this stream'
      );
    }

    const chatExpiresDelay = previewOnly ? 1 : ALS_CHAT_EXPIRATION_DELAY_MIN;
    const tokenParams = new CreateChatTokenCommand({
      roomIdentifier: dbLiveStream.aws.ivsChatRoomArn,
      userId: new ObjectID().toString(),
      capabilities: isAdmin
        ? ['DELETE_MESSAGE', 'DISCONNECT_USER', 'SEND_MESSAGE']
        : ['SEND_MESSAGE'],
      sessionDurationInMinutes: chatExpiresDelay,
    });

    const { token, tokenExpirationTime, sessionExpirationTime } =
      await ivsChatClient.send(tokenParams);

    return {
      sessionExpirationTime,
      token,
      tokenExpirationTime,
    };
  } finally {
    await client.close();
  }
}
