const { expect } = require('chai');
const { spy } = require('sinon');
const Telegram = require('./');

const request = {
  makeRequest: spy()
};
const telegram = new Telegram(request);

describe('Telegram model', () => {
  it('should initialize', () => {
    expect(telegram).to.be.a('object');
  });

  describe('Telegram.sendMessage', () => {});
});
