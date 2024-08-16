/* eslint-disable import/no-relative-packages */
function DebugTimer(label) {
  this.label = label;
  this.startTime = Date.now();
  this.endTime = null;
  this.metrics = [];
}

DebugTimer.prototype.start = function start() {
  this.startTime = Date.now();
  this.endTime = null;
};

DebugTimer.prototype.stop = function stop() {
  this.endTime = Date.now();
};

DebugTimer.prototype.print = function print(metric = '', extra = {}) {
  const startTime = this.startTime || Date.now();
  const endTime = this.endTime || Date.now();
  const duration = (endTime - startTime) / 1000;

  const isoStart = new Date(startTime).toISOString();
  const isoEnd = new Date(endTime).toISOString();

  const extraStr = Object.keys(extra)
    .reduce((acc, key) => {
      acc.push(`${key}=${extra[key]}`);
      return acc;
    }, [])
    .join(',');

  const toPrint = [
    'DebugTimer',
    this.label,
    metric,
    `${duration.toFixed(3)}s`,
    extraStr,
    `(${isoStart} -> ${isoEnd})`,
  ].filter((x) => x);
  // eslint-disable-next-line no-console
  console.log(...toPrint);

  this.metrics.push({
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    duration,
    label: this.label,
    metric,
    extra,
  });
};

export default DebugTimer;
