const locations = [
  'asia_pacific_australia',
  'asia_pacific_india',
  'asia_pacific_japan',
  'asia_pacific_singapore',
  'asia_pacific_s_korea',
  'asia_pacific_taiwan',
  'eu_belgium',
  'eu_germany',
  'eu_ireland',
  'south_america_brazil',
  'us_central_iowa',
  'us_east_s_carolina',
  'us_east_virginia',
  'us_west_california',
  'us_west_oregon',
];

const {
  STAGE,
} = process.env;

export default {
  streamSize(width, height) {
    if (width < 0 || height < 0) return (false);
    if (width % 8 !== 0 || height % 8 !== 0) return (false);

    if (width / 16 === height / 9) return (true);
    if (width / 4 === height / 3) return (true);

    return (false);
  },
  broadcastLocation(location) {
    return (locations.indexOf(location) >= 0);
  },
  name(name, appId) {
    const dbName = `${appId}-${STAGE}-${name}`;
    return (dbName.length <= 200);
  },
  startDateTime(time) {
    if (!time.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/)) return (false);

    return (true);
  },
};
