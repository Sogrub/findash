import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "@app/common/database/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { JwtPayload } from "./strategies/jwt.strategy";
import { GoogleProfile } from "./strategies/google.strategy";
import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  public async register(dto: RegisterDto, ipAddress?: string): Promise<{ accessToken: string }> {
    const clientRole = await this.prisma.role.findFirstOrThrow({ where: { name: "CLIENT" } });
    const passwordHash = await this.hashPassword(dto.password);

    const user = await this.prisma.user.create({
      data: {
        document: dto.document,
        fullName: dto.fullName,
        email: dto.email,
        passwordHash,
        roleId: clientRole.id,
        account: {
          create: {
            accountNumber: this.generateAccountNumber(),
            balance: 0,
          },
        },
      },
      include: { role: true },
    });

    await this.prisma.userLogin.create({
      data: { userId: user.id, ipAddress, success: true },
    });

    return { accessToken: this.signToken(user.id, user.email, user.role.name, user.jwtVersion, user.fullName) };
  }

  public async login(dto: LoginDto, ipAddress?: string): Promise<{ accessToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: true },
    });

    const isValid =
      user?.passwordHash && (await this.comparePasswords(dto.password, user.passwordHash));

    await this.prisma.userLogin
      .create({
        data: { userId: user?.id ?? "", ipAddress, success: !!isValid },
      })
      .catch(() => null);

    if (!isValid) throw new UnauthorizedException("Invalid credentials");

    return { accessToken: this.signToken(user.id, user.email, user.role.name, user.jwtVersion, user.fullName) };
  }

  public async googleLogin(profile: GoogleProfile): Promise<{ accessToken: string }> {
    let user = await this.prisma.user.findFirst({
      where: { OR: [{ googleId: profile.googleId }, { email: profile.email }] },
      include: { role: true },
    });

    if (!user) {
      const clientRole = await this.prisma.role.findFirstOrThrow({ where: { name: "CLIENT" } });
      user = await this.prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          fullName: profile.fullName,
          avatarUrl: profile.avatarUrl,
          document: `GOOGLE-${profile.googleId}`,
          roleId: clientRole.id,
          account: { create: { accountNumber: this.generateAccountNumber(), balance: 0 } },
        },
        include: { role: true },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId, avatarUrl: profile.avatarUrl },
        include: { role: true },
      });
    }

    return { accessToken: this.signToken(user.id, user.email, user.role.name, user.jwtVersion, user.fullName, user.avatarUrl ?? undefined) };
  }

  public async forgotPassword(dto: ForgotPasswordDto): Promise<{ code: string }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) throw new NotFoundException("Usuario no encontrado");
    if (!user.passwordHash) throw new BadRequestException("Esta cuenta usa autenticación de Google");

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedCode = await this.hashPassword(code);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: hashedCode, passwordResetExpiry: expiry },
    });

    return { code }; // En producción se enviaría por correo
  }

  public async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email, passwordResetExpiry: { gt: new Date() } },
    });

    if (!user?.passwordResetToken) {
      throw new BadRequestException("Código inválido o expirado");
    }

    const valid = await this.comparePasswords(dto.code, user.passwordResetToken);
    if (!valid) throw new BadRequestException("Código inválido o expirado");

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await this.hashPassword(dto.newPassword),
        passwordResetToken: null,
        passwordResetExpiry: null,
        jwtVersion: { increment: 1 },
      },
    });
  }

  public async logout(token: string | null): Promise<void> {
    if (!token) return;
    try {
      const payload = this.jwtService.decode(token) as JwtPayload | null;
      if (!payload?.sub) return;
      await this.prisma.user.update({
        where: { id: payload.sub },
        data: { jwtVersion: { increment: 1 } },
      }).catch(() => null);
    } catch {
      // token inválido — el cliente igual limpiará la cookie
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString("hex");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${salt}:${derivedKey.toString("hex")}`;
  }

  private async comparePasswords(password: string, stored: string): Promise<boolean> {
    const [salt, hash] = stored.split(":");
    const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
    return timingSafeEqual(derivedKey, Buffer.from(hash, "hex"));
  }

  private signToken(
    userId: string,
    email: string,
    role: string,
    jwtVersion: number,
    fullName: string,
    avatarUrl?: string | null,
  ): string {
    const payload: JwtPayload = { sub: userId, email, role, jv: jwtVersion, fullName, avatarUrl };
    return this.jwtService.sign(payload);
  }

  private generateAccountNumber(): string {
    const random = randomBytes(4).readUInt32BE(0) % 100000;
    return `FD${Date.now()}${random.toString().padStart(5, "0")}`;
  }
}
