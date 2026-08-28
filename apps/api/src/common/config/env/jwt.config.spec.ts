import jwtConfig, { JwtConfigVariables } from "./jwt.config";

describe("jwtConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      JWT_SECRET: "super-secret-key",
      JWT_EXPIRES_IN: "7d",
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns secret from JWT_SECRET", () => {
    const config = jwtConfig();
    expect(config.secret).toBe("super-secret-key");
  });

  it("returns expiresIn from JWT_EXPIRES_IN", () => {
    const config = jwtConfig();
    expect(config.expiresIn).toBe("7d");
  });

  it("throws when JWT_SECRET is missing", () => {
    delete process.env["JWT_SECRET"];
    expect(() => jwtConfig()).toThrow();
  });

  it("JwtConfigVariables class instantiates correctly", () => {
    const vars = new JwtConfigVariables();
    expect(vars).toBeInstanceOf(JwtConfigVariables);
  });
});
