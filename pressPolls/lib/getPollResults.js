/* eslint-disable import/no-relative-packages */
import Random from '../../libs/account_utils/random.ts';
import MongoClient from '../../libs/mongoClient';
import mongoCollections from '../../libs/mongoCollections.json';
import { userPrivateFieldsProjection } from '../../users/lib/usersUtils.ts';
import { fetchPollCounters } from './getPoll';
import { formatMessage } from '../../libs/intl/intl';

const { COLL_PRESS_POLLS, COLL_PRESS_POLLS_VOTES, COLL_USERS } =
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
export function pollResultsToCsv(pollResults) {
  const { poll, votes } = pollResults;

  let output = '';
  const firstLine = [
    formatMessage('pressPolls:export.col_name'),
    formatMessage('pressPolls:export.col_uid'),
    formatMessage('pressPolls:export.col_device'),
  ];

  poll.options.forEach(({ text }) => {
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

    poll.options.forEach(({ id }) => {
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
  pollId,
  appId,
  { exportToken: inputExportToken = null, start = null, limit = null } = {}
) => {
  const client = await MongoClient.connect();

  try {
    const poll = await client
      .db()
      .collection(COLL_PRESS_POLLS)
      .findOne({ _id: pollId, appId });

    if (!poll) {
      throw new Error('content_not_found');
    }

    const exportToken = poll.exportToken || Random.id(24);
    if (!poll.exportToken) {
      await client.db().collection(COLL_PRESS_POLLS).updateOne(
        { _id: pollId, appId },
        {
          $set: { exportToken },
        }
      );
    }

    if (inputExportToken && inputExportToken !== exportToken) {
      throw new Error('access_forbidden');
    }

    const { allVotes } = await fetchPollCounters(poll, { appId, client });

    const pipeline = [
      {
        $match: {
          pollId,
          appId,
        },
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
      .collection(COLL_PRESS_POLLS_VOTES)
      .aggregate(pipeline)
      .toArray();

    return {
      counters: allVotes,
      exportToken,
      poll,
      votes,
    };
  } finally {
    client.close();
  }
};
