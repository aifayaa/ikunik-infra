import each from 'lodash/each';

const findAndReplace = (obj) => {
  each(obj, (value, key) => {
    if (typeof value === 'object') {
      findAndReplace(value);
    } else if (typeof value === 'string') {
      switch (value) {
        case '%lastMonth':
          obj[key] = new Date(new Date().setMonth(new Date().getMonth() - 1));
          break;
        default:
      }
    }
  });
};

export default findAndReplace;
