import crawlerUserAgents from './crawlerUserAgents';

export default (userAgent) => {
  const match = crawlerUserAgents
    .filter((crawlerUserAgent) => userAgent.indexOf(crawlerUserAgent) + 1);
  return !!match.length;
};
