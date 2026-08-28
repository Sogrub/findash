import { UnauthorizedException } from "@nestjs/common";
import { JwtStrategy, JwtPayload } from "./jwt.strategy";
import { PrismaService } from "@app/common/database/prisma.service";

jest.mock("passport-jwt", () => ({
  ExtractJwt: { fromAuthHeaderAsBearerToken: jest.fn().mockReturnValue(jest.fn()) },
  Strategy: class {
    constructor(_opts: unknown) {}
  },
}));

jest.mock("@nestjs/passport", () => ({
  PassportStrategy: (Strategy: any) =>
    class extends Strategy {
      constructor(opts: unknown) {
        super(opts);
      }
    },
}));

const mockPrisma = {
  user: { findUnique: jest.fn() },
} as unknown as PrismaService;

const mockConfigService = {
  get: jest.fn().mockReturnValue({ secret: "test-secret" }),
} as any;

function buildStrategy(): JwtStrategy {
  return new JwtStrategy(mockConfigService, mockPrisma);
}

const basePayload: JwtPayload = {
  sub: "user-uuid",
  email: "test@example.com",
  role: "CLIENT",
  jv: 1,
  fullName: "Test User",
};

describe("JwtStrategy", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns payload when user exists and jwtVersion matches", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ jwtVersion: 1 });
    const strategy = buildStrategy();

    const result = await strategy.validate(basePayload);

    expect(result).toEqual(basePayload);
  });

  it("throws UnauthorizedException when sub is missing", async () => {
    const strategy = buildStrategy();

    await expect(strategy.validate({ ...basePayload, sub: "" })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it("throws UnauthorizedException when user is not found", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const strategy = buildStrategy();

    await expect(strategy.validate(basePayload)).rejects.toThrow(UnauthorizedException);
  });

  it("throws UnauthorizedException when jwtVersion does not match", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ jwtVersion: 99 });
    const strategy = buildStrategy();

    await expect(strategy.validate(basePayload)).rejects.toThrow(UnauthorizedException);
  });

  it("throws when JWT config is missing", () => {
    const badConfig = { get: jest.fn().mockReturnValue(null) } as any;

    expect(() => new JwtStrategy(badConfig, mockPrisma)).toThrow(
      "JWT configuration is missing",
    );
  });

  it("includes avatarUrl in returned payload when present", async () => {
    (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ jwtVersion: 1 });
    const strategy = buildStrategy();
    const payload = { ...basePayload, avatarUrl: "https://example.com/avatar.png" };

    const result = await strategy.validate(payload);

    expect(result.avatarUrl).toBe("https://example.com/avatar.png");
  });
});
