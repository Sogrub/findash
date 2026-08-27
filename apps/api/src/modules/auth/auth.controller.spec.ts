import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { GoogleProfile } from "./strategies/google.strategy";
import { JwtPayload } from "./strategies/jwt.strategy";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    googleLogin: jest.Mock;
    logout: jest.Mock;
    forgotPassword: jest.Mock;
    resetPassword: jest.Mock;
  };

  beforeEach(async () => {
    authService = {
      register: jest.fn().mockResolvedValue({ accessToken: "mock-token" }),
      login: jest.fn().mockResolvedValue({ accessToken: "mock-token" }),
      googleLogin: jest.fn().mockResolvedValue({ accessToken: "mock-token" }),
      logout: jest.fn().mockResolvedValue(undefined),
      forgotPassword: jest.fn().mockResolvedValue({ code: "123456" }),
      resetPassword: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue({ frontendUrl: "http://localhost:4000" }) },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // ── register ────────────────────────────────────────────────────────────────

  describe("register", () => {
    it("should delegate to AuthService and return the access token", async () => {
      const dto: RegisterDto = {
        email: "test@example.com",
        password: "password123",
        fullName: "Test User",
        document: "123456789",
      };

      const result = await controller.register(dto, "127.0.0.1");

      expect(authService.register).toHaveBeenCalledWith(dto, "127.0.0.1");
      expect(result).toEqual({ accessToken: "mock-token" });
    });
  });

  // ── login ───────────────────────────────────────────────────────────────────

  describe("login", () => {
    it("should delegate to AuthService and return the access token", async () => {
      const dto: LoginDto = { email: "test@example.com", password: "password123" };

      const result = await controller.login(dto, "127.0.0.1");

      expect(authService.login).toHaveBeenCalledWith(dto, "127.0.0.1");
      expect(result).toEqual({ accessToken: "mock-token" });
    });
  });

  // ── logout ──────────────────────────────────────────────────────────────────

  describe("logout", () => {
    it("should call authService.logout with the user id from the JWT payload", async () => {
      const user: JwtPayload = { sub: "user-uuid", email: "test@example.com", role: "CLIENT", jv: 0 };

      const result = await controller.logout(user);

      expect(authService.logout).toHaveBeenCalledWith("user-uuid");
      expect(result).toEqual({ message: "Sesión cerrada correctamente" });
    });
  });

  // ── forgotPassword ──────────────────────────────────────────────────────────

  describe("forgotPassword", () => {
    it("should delegate to AuthService and return the recovery code", async () => {
      const dto: ForgotPasswordDto = { email: "test@example.com" };

      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ code: "123456" });
    });
  });

  // ── resetPassword ───────────────────────────────────────────────────────────

  describe("resetPassword", () => {
    it("should delegate to AuthService and return void", async () => {
      const dto: ResetPasswordDto = {
        email: "test@example.com",
        code: "123456",
        newPassword: "NewPass123!",
      };

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toBeUndefined();
    });
  });

  // ── googleCallback ──────────────────────────────────────────────────────────

  describe("googleCallback", () => {
    it("should redirect to frontend with the JWT token after Google OAuth", async () => {
      const profile: GoogleProfile = {
        googleId: "google-123",
        email: "google@example.com",
        fullName: "Google User",
        avatarUrl: "https://example.com/avatar.jpg",
      };
      const mockRes = { redirect: jest.fn() } as unknown as Response;

      await controller.googleCallback(profile, mockRes);

      expect(authService.googleLogin).toHaveBeenCalledWith(profile);
      expect(mockRes.redirect).toHaveBeenCalledWith(
        "http://localhost:4000/auth/callback?token=mock-token",
      );
    });
  });
});
