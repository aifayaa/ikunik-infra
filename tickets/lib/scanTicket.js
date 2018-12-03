import { MongoClient } from 'mongodb';

export default async (ticketSerial, scannerId) => {
  const client = await MongoClient.connect(process.env.MONGO_URL);
  try {
    const [[ticket], scanner] = await Promise.all([
      client.db(process.env.DB_NAME)
        .collection('tickets')
        .aggregate([
          {
            $match: { serial: ticketSerial },
          },
          {
            $lookup: {
              from: 'ticketCategories',
              localField: 'categoryId',
              foreignField: '_id',
              as: 'category',
            },
          },
          { $unwind: '$category' },
        ]).toArray(),
      client.db(process.env.DB_NAME)
        .collection('scanners')
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

    const updatedTicket = await client.db(process.env.DB_NAME)
      .collection('tickets')
      .findOneAndUpdate({
        _id: ticket._id,
      }, {
        $set: {
          scanStatus: 1,
          scannedDate: new Date(),
          scannedBy: scannerId,
        },
      }).then(res => res.value);
    if (updatedTicket) updatedTicket.category = ticket.category;
    return updatedTicket;
  } finally {
    client.close();
  }
};
