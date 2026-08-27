import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { NodeConfigEnvironment } from "@app/common/config/env/node.config";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import { GoogleGuard } from "./guards/google.guard";
import { JwtGuard } from "./guards/jwt.guard";
import { GoogleProfile } from "./strategies/google.strategy";
import { JwtPayload } from "./strategies/jwt.strategy";

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post("register")
  @ApiOperation({ summary: "Register a new client account" })
  register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.authService.register(dto, ip);
  }

  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login and receive a JWT token" })
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Post("logout")
  @UseGuards(JwtGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Logout and revoke JWT" })
  async logout(@CurrentUser() user: JwtPayload) {
    await this.authService.logout(user.sub);
    return { message: "Sesión cerrada correctamente" };
  }

  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Request a password reset code" })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Reset password using the recovery code" })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get("google")
  @UseGuards(GoogleGuard)
  @ApiOperation({ summary: "Redirect to Google OAuth" })
  googleAuth() {
    return;
  }

  @Get("google/callback")
  @UseGuards(GoogleGuard)
  @ApiOperation({ summary: "Google OAuth callback" })
  async googleCallback(@CurrentUser() profile: GoogleProfile, @Res() res: Response) {
    const { accessToken } = await this.authService.googleLogin(profile);
    const { frontendUrl } = this.configService.get<NodeConfigEnvironment>("node")!;
    res.redirect(`${frontendUrl}/auth/callback?token=${accessToken}`);
  }
}
