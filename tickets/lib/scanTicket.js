import MongoClient from '../../libs/mongoClient';

const {
  COLL_TICKETS,
  COLL_TICKET_CATEGORIES,
  COLL_SCANNERS,
  DB_NAME,
} = process.env;

export default async (ticketSerial, scannerId, appId) => {
  const client = await MongoClient.connect();
  try {
    const [[ticket], scanner] = await Promise.all([
      client
        .db(DB_NAME)
        .collection(COLL_TICKETS)
        .aggregate([
          {
            $match: {
              serial: ticketSerial,
              appIds: appId,
            },
          },
          {
            $lookup: {
              from: COLL_TICKET_CATEGORIES,
              localField: 'categoryId',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: '$category' },
        ]).toArray(),
      client
        .db(DB_NAME)
        .collection(COLL_SCANNERS)
        .findOne({
          _id: scannerId,
          active: true,
        }),
    ]);

    if (!scanner) throw new Error('invalid_scanner');
    if (!ticket) throw new Error('ticket_not_found');
    if (ticket.scanStatus) throw new Error('ticket_already_scanned');
    if (!ticket.category) throw new Error('ticket_category_not_exists');
    if (scanner.lineupId !== ticket.category.lineupId) throw new Error('scanner_unauthorized');

    const updatedTicket = await client
      .db(DB_NAME)
      .collection(COLL_TICKETS)
      .findOneAndUpdate({
        _id: ticket._id,
        appIds: appId,
      }, {
        $set: {
          scanStatus: 1,
          scannedDate: new Date(),
          scannedBy: scannerId,
        },
      }).then((res) => res.value);
    if (updatedTicket) updatedTicket.category = ticket.category;
    return updatedTicket;
  } finally {
    client.close();
  }
};
