import { MongoClient } from 'mongodb';
import moment from 'moment';

import generateMail from './generateMail';
import getUserLineups from '../../lineup/lib/getUserLineups';
import sendScanner from './sendScanner';

export default async (userId, scannerId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL, { useNewUrlParser: true });
  const curDate = new Date();
  let session;
  try {
    session = client.startSession();
    session.startTransaction();
    const opts = { session };
    const scanner = await client.db(process.env.DB_NAME).collection('scanners')
      .findOneAndUpdate({
        _id: scannerId,
      }, {
        $set: { lastEmail: curDate },
      }, opts).then(res => res.value);
    if (!scanner) {
      throw new Error('scanner_not_found');
    }

    const { lineupId, email, lastEmail } = scanner;
    // Spam check
    const now = moment(curDate);
    const end = moment(lastEmail);
    const duration = moment.duration(now.diff(end));
    if (duration.asMinutes() < process.env.FLOOD_THRESOLD) {
      throw new Error('scanner_send_flood');
    }

    // Check ownership
    const lineup = await getUserLineups(userId, lineupId);
    if (!lineup) {
      throw new Error('lineup_not_found');
    }

    await session.commitTransaction();

    const { name, date } = lineup;
    const data = {
      name: name || '',
      date: `${moment(date).format('DD/MM/YYYY HH:mm')}`,
      scannerId,
    };

    const tpl = generateMail({ type: 'standardMail', data });
    const scannerMail = {
      subject: `[Crowdaa] Instructions de compostage des billets ${name || ''}`,
      body: tpl,
      to: email,
    };
    await sendScanner(scannerMail);
    return true;
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    client.close();
    if (session) session.endSession();
  }
};
