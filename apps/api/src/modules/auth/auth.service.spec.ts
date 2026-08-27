import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";
import { PrismaService } from "@app/common/database/prisma.service";

const mockRole = { id: "role-uuid", name: "CLIENT", createdAt: new Date(), updatedAt: new Date() };

const mockUser = {
  id: "user-uuid",
  document: "123456789",
  fullName: "Test User",
  email: "test@example.com",
  passwordHash: null as string | null,
  googleId: null as string | null,
  avatarUrl: null as string | null,
  status: "ACTIVE",
  roleId: "role-uuid",
  passwordResetToken: null as string | null,
  passwordResetExpiry: null as Date | null,
  jwtVersion: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  role: mockRole,
};

describe("AuthService", () => {
  let service: AuthService;
  let prisma: {
    role: { findFirstOrThrow: jest.Mock };
    user: { create: jest.Mock; findUnique: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    userLogin: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      role: { findFirstOrThrow: jest.fn() },
      user: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      userLogin: { create: jest.fn().mockResolvedValue({}) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue("mock-jwt-token"), decode: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe("register", () => {
    it("should create user with account and return access token", async () => {
      prisma.role.findFirstOrThrow.mockResolvedValue(mockRole);
      prisma.user.create.mockResolvedValue({ ...mockUser, passwordHash: "salt:hash" });

      const result = await service.register({
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        document: "123456789",
      });

      expect(result).toEqual({ accessToken: "mock-jwt-token" });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: "test@example.com",
            roleId: mockRole.id,
            account: { create: expect.objectContaining({ balance: 0 }) },
          }),
        }),
      );
      expect(prisma.userLogin.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ success: true }) }),
      );
    });

    it("should propagate error when CLIENT role is not seeded", async () => {
      prisma.role.findFirstOrThrow.mockRejectedValue(new Error("No role found"));

      await expect(
        service.register({
          email: "test@example.com",
          password: "password123",
          fullName: "Test User",
          document: "123456789",
        }),
      ).rejects.toThrow("No role found");
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("should return access token for valid credentials", async () => {
      const hash = await (service as any).hashPassword("password123");
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      const result = await service.login({ email: "test@example.com", password: "password123" });

      expect(result).toEqual({ accessToken: "mock-jwt-token" });
      expect(prisma.userLogin.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ success: true }) }),
      );
    });

    it("should throw UnauthorizedException for wrong password", async () => {
      const hash = await (service as any).hashPassword("correct-password");
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: hash });

      await expect(
        service.login({ email: "test@example.com", password: "wrong-password" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException when user does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: "unknown@example.com", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException for Google-only account (no password)", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(
        service.login({ email: "google@example.com", password: "anypassword" }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── googleLogin ─────────────────────────────────────────────────────────────

  describe("googleLogin", () => {
    const googleProfile = {
      googleId: "google-123",
      email: "google@example.com",
      fullName: "Google User",
      avatarUrl: "https://example.com/avatar.jpg",
    };

    it("should create new user and account when Google identity does not exist", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      prisma.role.findFirstOrThrow.mockResolvedValue(mockRole);
      prisma.user.create.mockResolvedValue({ ...mockUser, googleId: "google-123" });

      const result = await service.googleLogin(googleProfile);

      expect(result).toEqual({ accessToken: "mock-jwt-token" });
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            googleId: "google-123",
            email: "google@example.com",
            account: { create: expect.anything() },
          }),
        }),
      );
    });

    it("should link googleId when an account with same email already exists", async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, googleId: null });
      prisma.user.update.mockResolvedValue({ ...mockUser, googleId: "google-123" });

      const result = await service.googleLogin(googleProfile);

      expect(result).toEqual({ accessToken: "mock-jwt-token" });
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ googleId: "google-123" }),
        }),
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("should return token for existing Google user without any DB writes", async () => {
      prisma.user.findFirst.mockResolvedValue({ ...mockUser, googleId: "google-123" });

      const result = await service.googleLogin(googleProfile);

      expect(result).toEqual({ accessToken: "mock-jwt-token" });
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  // ── forgotPassword ──────────────────────────────────────────────────────────

  describe("forgotPassword", () => {
    it("should generate a 6-digit code and store its hash", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: "salt:hash" });
      prisma.user.update.mockResolvedValue(mockUser);

      const result = await service.forgotPassword({ email: "test@example.com" });

      expect(result.code).toMatch(/^\d{6}$/);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: expect.any(String),
            passwordResetExpiry: expect.any(Date),
          }),
        }),
      );
    });

    it("should throw NotFoundException when email does not exist", async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.forgotPassword({ email: "nobody@example.com" })).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException for Google-only accounts", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...mockUser, passwordHash: null });

      await expect(service.forgotPassword({ email: "google@example.com" })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ── resetPassword ───────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    const dto = { email: "test@example.com", code: "123456", newPassword: "NewPass123!" };

    it("should update password and increment jwtVersion when code is valid", async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        passwordHash: "salt:hash",
        passwordResetToken: "hashed-code",
        passwordResetExpiry: new Date(Date.now() + 60_000),
      });
      jest.spyOn(service as any, "comparePasswords").mockResolvedValue(true);
      prisma.user.update.mockResolvedValue(mockUser);

      await service.resetPassword(dto);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            passwordResetToken: null,
            passwordResetExpiry: null,
            jwtVersion: { increment: 1 },
          }),
        }),
      );
    });

    it("should throw BadRequestException when code is invalid", async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        passwordResetToken: "hashed-code",
        passwordResetExpiry: new Date(Date.now() + 60_000),
      });
      jest.spyOn(service as any, "comparePasswords").mockResolvedValue(false);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when token is expired or missing", async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.resetPassword(dto)).rejects.toThrow(BadRequestException);
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe("logout", () => {
    let jwtService: { sign: jest.Mock; decode: jest.Mock };

    beforeEach(async () => {
      // re-get jwtService reference from module
      const module = await Test.createTestingModule({
        providers: [
          AuthService,
          { provide: PrismaService, useValue: prisma },
          { provide: JwtService, useValue: { sign: jest.fn(), decode: jest.fn() } },
        ],
      }).compile();
      service = module.get(AuthService);
      jwtService = module.get(JwtService);
    });

    it("decodes the token and increments jwtVersion", async () => {
      jwtService.decode.mockReturnValue({ sub: "user-uuid" });
      prisma.user.update.mockResolvedValue(mockUser);

      await service.logout("valid.jwt.token");

      expect(jwtService.decode).toHaveBeenCalledWith("valid.jwt.token");
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-uuid" },
        data: { jwtVersion: { increment: 1 } },
      });
    });

    it("does nothing when token is null", async () => {
      await service.logout(null);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("does nothing when decoded token has no sub", async () => {
      jwtService.decode.mockReturnValue({});

      await service.logout("token.without.sub");

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("does not throw when user is not found in DB", async () => {
      jwtService.decode.mockReturnValue({ sub: "ghost-uuid" });
      prisma.user.update.mockRejectedValue(new Error("Not found"));

      await expect(service.logout("token")).resolves.toBeUndefined();
    });
  });
});
