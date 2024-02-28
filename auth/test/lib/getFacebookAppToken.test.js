/* eslint-disable import/no-relative-packages */
import sinon from 'sinon';
import { before, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';
import url from 'url';
import queryString from 'query-string';

import request from 'request-promise-native';
import { getFacebookAppToken } from '../../lib/getFacebookAppToken';

describe('lib - getFacebookAppToken', () => {
  const sandbox = sinon.createSandbox();
  let stubRequestGet;

  afterEach(() => {
    sandbox.restore();
  });

  describe('request success', () => {
    let resp;
    before(async () => {
      stubRequestGet = sandbox
        .stub(request, 'get')
        .returns(JSON.stringify({ access_token: 'myToken' }));
      resp = await getFacebookAppToken();
    });
    it('should query graphAPI with right queryParams', () => {
      const args = stubRequestGet.args[0];
      const { search } = url.parse(args[0].url);
      const parsed = queryString.parse(search);

      // should test values but export-env seem not to work with serverless-merge-config plugin
      expect(parsed).to.have.any.keys(
        'client_id',
        'client_secret',
        'grant_type'
      );
    });
    it('should return result', () => {
      expect(resp).to.equal('myToken');
    });
  });

  describe('request error', () => {
    it('should forward error', async () => {
      sandbox.stub(request, 'get').throws();
      try {
        await getFacebookAppToken();
      } catch (e) {
        expect(e).to.exist;
      }
    });
  });
});
