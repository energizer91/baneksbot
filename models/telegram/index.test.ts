const makeRequestMock = jest.fn();

jest.mock("../network", () => ({
  __esModule: true,
  default: class {
    public makeRequest = makeRequestMock;
  },
  Methods: { GET: "GET", POST: "POST" },
}));

import Telegram from "./";

const telegram = new Telegram();

describe("Telegram model", () => {
  it("should initialize", () => {
    expect(telegram).toBeTruthy();
  });

  describe("Telegram.sendMessage", () => {
    it("should send message", async () => {
      makeRequestMock.mockResolvedValue({ ok: true, result: {} });

      await telegram.sendMessage(123, "lol");

      expect(makeRequestMock).toHaveBeenCalledTimes(1);
    });
  });
});
