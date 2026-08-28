import swaggerConfig, { SwaggerEnvironmentVariables } from "./swagger.config";

describe("swaggerConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APP_TITLE: "FinDash API",
      APP_DESCRIPTION: "Financial Dashboard API",
      APP_VERSION: "1.0.0",
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns title from APP_TITLE", () => {
    const config = swaggerConfig();
    expect(config.title).toBe("FinDash API");
  });

  it("returns description from APP_DESCRIPTION", () => {
    const config = swaggerConfig();
    expect(config.description).toBe("Financial Dashboard API");
  });

  it("returns version from APP_VERSION", () => {
    const config = swaggerConfig();
    expect(config.version).toBe("1.0.0");
  });

  it("throws when APP_TITLE is missing", () => {
    delete process.env["APP_TITLE"];
    expect(() => swaggerConfig()).toThrow();
  });

  it("SwaggerEnvironmentVariables class instantiates correctly", () => {
    const vars = new SwaggerEnvironmentVariables();
    expect(vars).toBeInstanceOf(SwaggerEnvironmentVariables);
  });
});
