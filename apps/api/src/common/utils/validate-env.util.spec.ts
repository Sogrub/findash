import { IsString, IsOptional } from "class-validator";
import { Expose } from "class-transformer";
import { validateEnvironment } from "./validate-env.util";

class TestConfig {
  @IsString()
  @Expose()
  API_KEY!: string;

  @IsOptional()
  @IsString()
  @Expose()
  OPTIONAL_VAR?: string;
}

class InvalidConfig {
  @IsString()
  @Expose()
  REQUIRED_FIELD!: string;
}

describe("validateEnvironment", () => {
  const originalEnv = process.env["NODE_ENV"];

  afterEach(() => {
    process.env["NODE_ENV"] = originalEnv;
  });

  it("returns validated config for valid input", () => {
    process.env["NODE_ENV"] = "test";
    const config = { API_KEY: "my-secret-key" };

    const result = validateEnvironment(config, TestConfig);

    expect(result.API_KEY).toBe("my-secret-key");
  });

  it("throws when required field is missing", () => {
    const config = {};

    expect(() => validateEnvironment(config, InvalidConfig)).toThrow();
  });

  it("logs variables in non-production environment", () => {
    process.env["NODE_ENV"] = "development";
    const logSpy = jest.spyOn(require("@nestjs/common").Logger.prototype, "log").mockImplementation(() => {});
    const config = { API_KEY: "dev-key" };

    validateEnvironment(config, TestConfig);

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("does not log in production environment", () => {
    process.env["NODE_ENV"] = "production";
    const logSpy = jest.spyOn(require("@nestjs/common").Logger.prototype, "log").mockImplementation(() => {});
    const config = { API_KEY: "prod-key" };

    validateEnvironment(config, TestConfig);

    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("excludes extraneous values not in class", () => {
    process.env["NODE_ENV"] = "test";
    const config = { API_KEY: "key", UNKNOWN_VAR: "should-be-excluded" };

    const result = validateEnvironment(config, TestConfig);

    expect((result as any)["UNKNOWN_VAR"]).toBeUndefined();
  });
});
