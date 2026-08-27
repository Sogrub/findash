import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JwtConfigEnvironment } from "@app/common/config/env/jwt.config";
import { PrismaService } from "@app/common/database/prisma.service";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  jv: number;
  fullName: string;
  avatarUrl?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const jwtConfig = configService.get<JwtConfigEnvironment>("jwt");
    if (!jwtConfig) throw new Error("JWT configuration is missing");

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConfig.secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) throw new UnauthorizedException();

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { jwtVersion: true },
    });

    if (!user || user.jwtVersion !== payload.jv) {
      throw new UnauthorizedException("Sesión inválida o expirada");
    }

    return payload;
  }
}
