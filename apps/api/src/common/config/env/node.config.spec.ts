import nodeConfig, { NodeConfigVariables } from "./node.config";

describe("nodeConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      PORT: "3000",
      REQUEST_TIMEOUT: "30000",
      APP_NAME: "FinDash",
      API_VERSION: "1.0",
      FRONTEND_URL: "http://localhost:4200",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns nodeEnv from NODE_ENV", () => {
    const config = nodeConfig();
    expect(config.nodeEnv).toBe("test");
  });

  it("returns port as number from PORT", () => {
    const config = nodeConfig();
    expect(config.port).toBe(3000);
  });

  it("returns requestTimeout as number from REQUEST_TIMEOUT", () => {
    const config = nodeConfig();
    expect(config.requestTimeout).toBe(30000);
  });

  it("returns appName from APP_NAME", () => {
    const config = nodeConfig();
    expect(config.appName).toBe("FinDash");
  });

  it("returns apiVersion from API_VERSION", () => {
    const config = nodeConfig();
    expect(config.apiVersion).toBe("1.0");
  });

  it("returns frontendUrl from FRONTEND_URL", () => {
    const config = nodeConfig();
    expect(config.frontendUrl).toBe("http://localhost:4200");
  });

  it("throws when PORT is missing", () => {
    delete process.env["PORT"];
    expect(() => nodeConfig()).toThrow();
  });

  it("NodeConfigVariables class instantiates correctly", () => {
    const vars = new NodeConfigVariables();
    expect(vars).toBeInstanceOf(NodeConfigVariables);
  });
});
