import { MongoClient } from 'mongodb';
import moment from 'moment';
import uuidv4 from 'uuid/v4';

import generateMail from './generateMail';
import getUserLineups from '../../lineup/lib/getUserLineups';
import sendScanner from './sendScanner';

export default async (userId, lineupId, email) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  try {
    const lineup = await getUserLineups(userId, lineupId);
    if (!lineup) {
      throw new Error('lineup_not_found');
    }

    const scannerId = uuidv4();
    const scanner = {
      _id: scannerId,
      email,
      active: true,
      lineupId,
      createdAt: new Date(),
    };
    await client.db(process.env.DB_NAME).collection('scanners')
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
  } catch (error) {
    throw error;
  } finally {
    client.close();
  }
};
