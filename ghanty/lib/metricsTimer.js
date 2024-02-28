/* eslint-disable import/no-relative-packages */
function MetricsTimer(lambda) {
  this.lambda = lambda;
  this.startTime = Date.now();
  this.metrics = [];
}

MetricsTimer.prototype.start = function start() {
  this.startTime = Date.now();
};

MetricsTimer.prototype.end = function end() {
  this.endTime = Date.now();
};

MetricsTimer.prototype.print = function print(metric, extra = {}) {
  const endTime = this.endTime || Date.now();
  const isoStart = new Date(this.startTime).toISOString();
  const isoEnd = new Date(endTime).toISOString();
  const duration = (endTime - this.startTime) / 1000;

  const extraStr = Object.keys(extra).reduce((acc, key) => {
    acc.push(`${key}=${extra[key]}`);
    return acc;
  }, []);

  this.metrics.push({
    startTime: new Date(this.startTime),
    endTime: new Date(endTime),
    duration,
    lambda: this.lambda,
    metric,
    extra,
  });

  // eslint-disable-next-line no-console
  console.log(
    `MetricsTimer ${this.lambda} ${metric} '${extraStr}' ${duration} (${isoStart} -> ${isoEnd})`
  );
};

MetricsTimer.prototype.save = async function save(client) {
  await client.db().collection('ghantyMetricsTimer').insertMany(this.metrics);

  this.metrics = [];
};

export default MetricsTimer;
