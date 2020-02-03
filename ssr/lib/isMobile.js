export default (userAgent) => {
  const lua = userAgent.toLowerCase();
  return !!(lua.indexOf('android') + 1) || !!(lua.indexOf('phone') + 1);
};
