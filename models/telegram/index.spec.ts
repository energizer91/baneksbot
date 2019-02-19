import { expect, use } from 'chai';
import * as proxyquire from 'proxyquire';
import { spy } from 'sinon';
import * as sinonChai from 'sinon-chai';

use(sinonChai);

const makeRequestSpy = spy();
const Telegram = proxyquire('./', {
  '../network': () => ({
    makeRequest: makeRequestSpy
  })
}).default;

const telegram = new Telegram();

console.log(telegram.makeRequest);

describe('Telegram model', () => {
  it('should initialize', () => {
    expect(telegram).to.be.a('object');
  });

  xdescribe('Telegram.sendMessage',  () => {
    it('should send message', async () => {
      await telegram.sendMessage(123, 'lol');

      expect(makeRequestSpy).to.be.calledTwice;
    });
  });
});
