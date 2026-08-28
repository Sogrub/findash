import nodeConfig from "@app/common/config/env/node.config";
import swaggerConfig from "@app/common/config/env/swagger.config";
import jwtConfig from "@app/common/config/env/jwt.config";
import googleConfig from "@app/common/config/env/google.config";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "@app/common/database/prisma.module";
import { AuthModule } from "@app/modules/auth/auth.module";
import { AccountsModule } from "@app/modules/accounts/accounts.module";
import { TransactionsModule } from "@app/modules/transactions/transactions.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env"],
      load: [nodeConfig, swaggerConfig, jwtConfig, googleConfig],
    }),
    PrismaModule,
    AuthModule,
    AccountsModule,
    TransactionsModule,
  ],
})
export class AppModule {}
