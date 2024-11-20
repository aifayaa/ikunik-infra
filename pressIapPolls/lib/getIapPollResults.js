/* eslint-disable import/no-relative-packages */
import Random from '../../libs/account_utils/random.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { userPrivateFieldsProjection } from '../../users/lib/usersUtils.ts';
import { formatMessage } from '../../libs/intl/intl';

const { COLL_PRESS_IAP_POLLS, COLL_PRESS_IAP_POLLS_VOTES, COLL_USERS } =
  mongoCollections;

function escapeCsvEntry(rawValue) {
  const value = `${rawValue}`;
  if (value.match(/[,"\n\r]/)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function escapeCsvLine(rawLine) {
  const line = rawLine.map(escapeCsvEntry);
  return `${line.join(',')}\n`;
}

// intlInit() should be called before calling this function
export function iapPollResultsToCsv(IapPollResults) {
  const { iapPoll, votes } = IapPollResults;

  let output = '';
  const firstLine = [
    formatMessage('pressIapPolls:export.col_name'),
    formatMessage('pressIapPolls:export.col_uid'),
    formatMessage('pressIapPolls:export.col_device'),
  ];

  iapPoll.options.forEach(({ text }) => {
    firstLine.push(text);
  });
  output += escapeCsvLine(firstLine);

  votes.forEach((vote) => {
    const line = [];

    if (vote.user) {
      if (vote.user.profile) {
        if (vote.user.profile.firstname || vote.user.profile.lastname) {
          line.push(
            `${vote.user.profile.firstname || ''} ${vote.user.profile.lastname || ''}`.trim()
          );
        } else if (vote.user.profile.username) {
          line.push(vote.user.profile.username);
        } else if (vote.user.profile.email) {
          line.push(vote.user.profile.email);
        } else if (vote.user.username) {
          line.push(vote.user.username);
        } else {
          line.push(vote.user._id);
        }
      } else if (vote.user.username) {
        line.push(vote.user.username);
      } else {
        line.push(vote.user._id);
      }
    } else {
      line.push('');
    }

    line.push(vote.userId || '');
    line.push(vote.deviceId || '');

    const userVoted = vote.votes;

    iapPoll.options.forEach(({ id }) => {
      if (userVoted.indexOf(id) >= 0) {
        line.push('X');
      } else {
        line.push(' ');
      }
    });

    output += escapeCsvLine(line);
  });

  return output;
}

export default async (
  iapPollId,
  appId,
  { exportToken: inputExportToken = null, start = null, limit = null } = {}
) => {
  const client = await MongoClient.connect();

  try {
    const iapPoll = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS)
      .findOne({ _id: iapPollId, appId });

    if (!iapPoll) {
      throw new Error('content_not_found');
    }

    const exportToken = iapPoll.exportToken || Random.id(24);
    if (!iapPoll.exportToken) {
      await client.db().collection(COLL_PRESS_IAP_POLLS).updateOne(
        { _id: iapPollId, appId },
        {
          $set: { exportToken },
        }
      );
    }

    if (inputExportToken && inputExportToken !== exportToken) {
      throw new Error('access_forbidden');
    }

    const $match = {
      iapPollId,
      appId,
    };

    const pipeline = [
      {
        $match,
      },
    ];

    if (start !== null && limit !== null) {
      pipeline.push(
        {
          $skip: start,
        },
        {
          $limit: limit,
        }
      );
    }

    pipeline.push(
      {
        $lookup: {
          from: COLL_USERS,
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
          pipeline: [{ $project: userPrivateFieldsProjection }],
        },
      },
      {
        $unwind: {
          path: '$user',
          preserveNullAndEmptyArrays: true,
        },
      }
    );

    const votes = await client
      .db()
      .collection(COLL_PRESS_IAP_POLLS_VOTES)
      .aggregate(pipeline)
      .toArray();

    const ret = {
      exportToken,
      iapPoll,
      votes,
    };

    if (start !== null && limit !== null) {
      const totalVotes = await client
        .db()
        .collection(COLL_PRESS_IAP_POLLS_VOTES)
        .find($match)
        .count();

      ret.totalVotes = totalVotes;
    }

    return ret;
  } finally {
    client.close();
  }
};
