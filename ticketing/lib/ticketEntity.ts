export type TicketType = {
  _id: string;
  appId: string;
  bookableId: string;
  bookedAt: string | Date;
  bookedBy: string;
  scans: [
    {
      scannedBy: string;
      scannedAt: string | Date;
      location: {
        label: string;
        geo?: {
          lat: number;
          lon: number;
        };
      };
    }?,
  ];
};
