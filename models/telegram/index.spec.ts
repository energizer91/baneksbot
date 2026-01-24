import { expect, use } from "chai";
import * as proxyquire from "proxyquire";
import { spy } from "sinon";
import * as sinonChai from "sinon-chai";

use(sinonChai);

const makeRequestSpy = spy();
const Telegram = proxyquire("./", {
  "../network": () => ({
    makeRequest: makeRequestSpy,
  }),
}).default;

const telegram = new Telegram();

// tslint:disable-next-line:no-console
console.log(telegram.makeRequest);

describe("Telegram model", () => {
  it("should initialize", () => {
    expect(telegram).to.be.a("object");
  });

  describe("Telegram.sendMessage", () => {
    it("should send message", async () => {
      await telegram.sendMessage(123, "lol");

      // tslint:disable-next-line:no-unused-expression
      expect(makeRequestSpy).to.be.calledTwice;
    });
  });
});
