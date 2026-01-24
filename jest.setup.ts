process.env.NODE_ENV = "test";
process.env.NODE_CONFIG_STRICT_MODE = "false";

jest.mock("prom-client", () => {
  const noop = (): void => undefined;
  const startTimer = (): (() => void) => noop;

  const mocked = {
    collectDefaultMetrics: jest.fn(),
    Counter: jest.fn().mockImplementation(() => ({
      inc: noop,
      reset: noop,
    })),
    Gauge: jest.fn().mockImplementation(() => ({
      dec: noop,
      inc: noop,
      reset: noop,
      set: noop,
    })),
    Histogram: jest.fn().mockImplementation(() => ({
      observe: noop,
      reset: noop,
      startTimer,
    })),
    register: {
      contentType: "text/plain",
      metrics: jest.fn().mockResolvedValue(""),
    },
  };

  return {
    __esModule: true,
    default: mocked,
    ...mocked,
  };
});
