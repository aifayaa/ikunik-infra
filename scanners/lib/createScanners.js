import MongoClient from '../../libs/mongoClient'
import moment from 'moment';
import uuidv4 from 'uuid/v4';

import generateMail from './generateMail';
import getUserLineups from '../../lineup/lib/getUserLineups';
import sendScanner from './sendScanner';

export default async (userId, profileId, lineupId, email, appId) => {
  const client = await MongoClient.connect();
  try {
    const lineup = await getUserLineups(userId, profileId, lineupId, appId);
    if (!lineup) {
      throw new Error('lineup_not_found');
    }

    const scannerId = uuidv4();
    const curDate = new Date();
    const scanner = {
      _id: scannerId,
      email,
      active: true,
      lineupId,
      createdAt: curDate,
      lastEmail: curDate,
      appIds: [appId],
    };
    await client
      .db(process.env.DB_NAME)
      .collection(process.env.COLL_SCANNERS)
      .insertOne(scanner);
    const data = {
      name: lineup.name || '',
      date: `${moment(lineup.date).format('DD/MM/YYYY HH:mm')}`,
      scannerId,
    };

    const tpl = generateMail({ type: 'standardMail', data });
    const scannerMail = {
      subject: `[Crowdaa] Instructions de compostage des billets ${lineup.name || ''}`,
      body: tpl,
      to: email,
    };
    await sendScanner(scannerMail);
    return true;
  } finally {
    client.close();
  }
};
