import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import jwtConfig, { JwtConfigEnvironment } from "@app/common/config/env/jwt.config";
import googleConfig, { GoogleConfigEnvironment } from "@app/common/config/env/google.config";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GoogleGuard } from "./guards/google.guard";
import { JwtGuard } from "./guards/jwt.guard";
import { RolesGuard } from "./guards/roles.guard";
import { GoogleStrategy } from "./strategies/google.strategy";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [jwtConfig.KEY],
      useFactory: (config: JwtConfigEnvironment) => ({
        secret: config.secret,
        signOptions: { expiresIn: config.expiresIn as never },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtGuard,
    RolesGuard,
    GoogleGuard,
    {
      provide: GoogleStrategy,
      inject: [googleConfig.KEY],
      useFactory: (config: GoogleConfigEnvironment) => new GoogleStrategy(config),
    },
  ],
  exports: [JwtGuard, RolesGuard],
})
export class AuthModule {}
