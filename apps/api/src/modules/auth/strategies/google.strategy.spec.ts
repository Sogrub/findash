import { GoogleStrategy } from "./google.strategy";

jest.mock("passport-google-oauth20", () => {
  const Strategy = class {
    constructor(options: unknown, verify: unknown) {}
  };
  return { Strategy, Profile: {} };
});

function buildStrategy() {
  return new GoogleStrategy({
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    callbackUrl: "http://localhost:3000/auth/google/callback",
  });
}

describe("GoogleStrategy", () => {
  it("validates and returns a GoogleProfile", () => {
    const strategy = buildStrategy();
    const profile = {
      id: "google-123",
      displayName: "Jane Doe",
      emails: [{ value: "jane@example.com" }],
      photos: [{ value: "https://example.com/photo.jpg" }],
    } as any;

    const result = strategy.validate("access-token", "refresh-token", profile);

    expect(result).toEqual({
      googleId: "google-123",
      email: "jane@example.com",
      fullName: "Jane Doe",
      avatarUrl: "https://example.com/photo.jpg",
    });
  });

  it("returns empty string for email when emails array is empty", () => {
    const strategy = buildStrategy();
    const profile = {
      id: "google-456",
      displayName: "No Email User",
      emails: [],
      photos: [{ value: "https://example.com/photo.jpg" }],
    } as any;

    const result = strategy.validate("", "", profile);

    expect(result.email).toBe("");
  });

  it("returns empty string for avatarUrl when photos is undefined", () => {
    const strategy = buildStrategy();
    const profile = {
      id: "google-789",
      displayName: "No Photo User",
      emails: [{ value: "user@example.com" }],
      photos: undefined,
    } as any;

    const result = strategy.validate("", "", profile);

    expect(result.avatarUrl).toBe("");
  });

  it("returns empty email when emails is undefined", () => {
    const strategy = buildStrategy();
    const profile = {
      id: "google-000",
      displayName: "Ghost User",
      emails: undefined,
      photos: [],
    } as any;

    const result = strategy.validate("", "", profile);

    expect(result.email).toBe("");
  });
});
