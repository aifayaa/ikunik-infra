import mongoCollections from '../../../libs/mongoCollections.json';
import { ObjectID } from '../../../libs/mongoClient';

const {
  COLL_CHATENGINE_ROOM_USERS,
} = mongoCollections;

const CHAT_INACTIVITY_NOTIFICATION_THRESHOLD = 60 * 1000;

function ChatMessageHandler() {
}

ChatMessageHandler.prototype.init = async function init() {
  const roomUsers = await this.client.db().collection(COLL_CHATENGINE_ROOM_USERS).findOne({
    _id: ObjectID(this.queueData.roomUsersId),
  });

  if (!roomUsers) return (false);

  this.roomId = this.queueData.roomId;
  this.message = this.queueData.message;
  this.usersHash = roomUsers.users.reduce((acc, userId) => {
    acc[userId] = true;
    return (acc);
  }, {});

  return (true);
};

ChatMessageHandler.prototype.processOne = function processOne({ user }) {
  const { message, roomId, usersHash } = this;

  if (!user) return ({ canNotify: false });
  if (!usersHash[user._id]) return ({ canNotify: false });

  if (
    !user.services ||
    !user.services.chatengine
  ) {
    return ({ canNotify: false });
  }

  const lastActivity =
    user.services.chatengine.lastActivity &&
    user.services.chatengine.lastActivity.getTime();
  const maxActivityTimeAllowed = Date.now() - CHAT_INACTIVITY_NOTIFICATION_THRESHOLD;
  if (lastActivity && lastActivity > maxActivityTimeAllowed) {
    return ({ canNotify: false });
  }

  return ({
    canNotify: true,
    data: {
      isText: true,
      content: message,
      extraData: { chatRoomId: roomId },
    },
  });
};

ChatMessageHandler.prototype.batchDone = function batchDone() {
};

export default ChatMessageHandler;
