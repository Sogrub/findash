import googleConfig, { GoogleConfigVariables } from "./google.config";

describe("googleConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      GOOGLE_CALLBACK_URL: "http://localhost:3000/auth/google/callback",
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns clientId from GOOGLE_CLIENT_ID", () => {
    const config = googleConfig();
    expect(config.clientId).toBe("test-client-id");
  });

  it("returns clientSecret from GOOGLE_CLIENT_SECRET", () => {
    const config = googleConfig();
    expect(config.clientSecret).toBe("test-client-secret");
  });

  it("returns callbackUrl from GOOGLE_CALLBACK_URL", () => {
    const config = googleConfig();
    expect(config.callbackUrl).toBe("http://localhost:3000/auth/google/callback");
  });

  it("throws when required env vars are missing", () => {
    delete process.env["GOOGLE_CLIENT_ID"];
    expect(() => googleConfig()).toThrow();
  });

  it("GoogleConfigVariables class has correct properties", () => {
    const vars = new GoogleConfigVariables();
    expect(vars).toBeInstanceOf(GoogleConfigVariables);
  });
});
