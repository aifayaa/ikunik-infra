import crypto from 'crypto';

export default () => [8, 4, 4, 4, 8].map(crypto.randomBytes).map(id => id.toString('hex')).join('-');
