/* eslint-disable import/no-relative-packages */
export function objGet(obj, keys, dft) {
  let keysArray = keys;
  let ret = obj;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  while (keysArray.length > 0) {
    try {
      const key = keysArray.shift();
      ret = ret[key];
    } catch (e) {
      return dft;
    }
  }

  if (ret === undefined) return dft;

  return ret;
}

export function objSet(obj, keys, value) {
  let keysArray = keys;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  const last = keysArray.pop();
  keysArray.forEach((key) => {
    if (!obj[key]) {
      obj[key] = {};
    }
    obj = obj[key];
  });
  obj[last] = value;
  return obj;
}

export function objUnset(obj, keys) {
  let keysArray = keys;
  let cursor = obj;
  if (typeof keys === 'string') {
    keysArray = keys.split('.');
  } else {
    keysArray = Array.prototype.slice.call(keys);
  }

  const last = keysArray.pop();

  while (keysArray.length > 0) {
    try {
      const key = keysArray.shift();
      cursor = cursor[key];
    } catch (e) {
      return;
    }
  }

  if (typeof cursor === 'object') {
    cursor[last] = null;
    delete cursor[last];
  }
}

export function indexObjectArrayWithKey(arrayOfObjects, key = '_id', to = {}) {
  const ret = arrayOfObjects.reduce((acc, obj) => {
    acc[objGet(obj, key)] = obj;
    return acc;
  }, to);

  return ret;
}
