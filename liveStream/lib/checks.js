const {
  STAGE,
} = process.env;

export default {
  name(name, appId) {
    const dbName = `${appId}-${STAGE}-${name}`;
    return (dbName.length <= 128 && name.length <= 80 && name.length > 0);
  },
  startDateTime(start) {
    if (!start.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/)) return (false);

    return (true);
  },
};
