import sinon from 'sinon';
import { before, after, beforeEach, afterEach, describe, it } from 'mocha';
import { expect } from 'chai';

import handler from '../../handlers/register';
import * as lib from '../../lib/register';
import * as libIntl from '../../../libs/intl/intl';

describe('handler - register', () => {
  let stubLib;
  let stubIntl;
  const accessToken = 'myAccessToken';
  let response;
  let responseBody;
  const event = {
    requestContext: {
      authorizer: {
        appId: 'myAppId',
      },
    },
  };
  const fullEvent = {
    ...event,
    body: JSON.stringify({
      accessToken,
      email: 'some@valid.email',
      username: 'some_user_name',
      password: 'some_password',
    }),
  };

  describe('normal register', () => {
    const userId = 'some_user_id';

    before(async () => {
      stubLib = sinon.stub(lib, 'register').returns({ userId });
      stubIntl = sinon.stub(libIntl, 'getUserLanguage').returns('en');
      response = await handler({
        ...fullEvent,
      });
      responseBody = JSON.parse(response.body);
    });

    after(() => {
      stubLib.restore();
      stubIntl.restore();
    });

    it('should return 200', () => {
      expect(response.statusCode).to.equal(200);
    });

    it('should return user id', () => {
      expect(responseBody.data._id).to.equal(userId);
    });
  });

  describe('invalid register cases from handler', () => {
    const userId = 'some_user_id';

    before(() => {
      stubLib = sinon.stub(lib, 'register').returns({ userId });
    });

    after(() => {
      stubLib.restore();
    });

    it('should return missing payload', async () => {
      response = await handler({
        ...event,
      });
      responseBody = JSON.parse(response.body);
      expect(responseBody.message).to.equal('missing_payload');
      expect(response.statusCode).to.equal(400);
    });

    it('should return invalid password length', async () => {
      response = await handler({
        ...event,
        body: JSON.stringify({
          accessToken,
          email: 'some@valid.email',
          username: 'some_user_name',
          password: 'short',
        }),
      });
      responseBody = JSON.parse(response.body);
      expect(responseBody.message).to.equal('invalid_password_length');
      expect(response.statusCode).to.equal(400);
    });

    it('should return wrong argument type', async () => {
      response = await handler({
        ...event,
        body: JSON.stringify({
          accessToken,
          email: 42,
          username: 42,
          password: 42,
        }),
      });
      responseBody = JSON.parse(response.body);
      expect(responseBody.message).to.equal('wrong_argument_type');
      expect(response.statusCode).to.equal(400);
    });
  });

  describe('invalid register cases from lib', () => {
    beforeEach(() => {
      stubLib = sinon.stub(lib, 'register');
    });

    afterEach(() => {
      stubLib.restore();
    });

    // TODO: FIX TEST
    it.skip('should return app not found', async () => {
      stubLib.throws(new Error('app_not_found'));

      response = await handler({
        ...fullEvent,
      });

      responseBody = JSON.parse(response.body);
      expect(responseBody.message).to.equal('app_not_found');
      expect(response.statusCode).to.equal(500);
    });

    // TODO: FIX TEST
    it.skip('should return username already exists', async () => {
      stubLib.throws(new Error('username_already_exists'));

      response = await handler({
        ...fullEvent,
      });

      responseBody = JSON.parse(response.body);
      expect(responseBody.message).to.equal('username_already_exists');
      expect(response.statusCode).to.equal(400);
    });

    // TODO: FIX TEST
    it.skip('should return email already exists', async () => {
      stubLib.throws(new Error('email_already_exists'));

      response = await handler({
        ...fullEvent,
      });

      responseBody = JSON.parse(response.body);
      expect(responseBody.message).to.equal('email_already_exists');
      expect(response.statusCode).to.equal(400);
    });

    it('should return a 500 error', async () => {
      stubLib.throws(new Error('Some error that could not be handled'));

      response = await handler({
        ...fullEvent,
      });

      expect(response.statusCode).to.equal(500);
    });
  });
});
