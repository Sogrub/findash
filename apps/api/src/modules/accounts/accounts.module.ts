import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthModule } from "@app/modules/auth/auth.module";
import { AccountsController } from "./accounts.controller";
import { AccountsService } from "./accounts.service";

@Module({
  imports: [AuthModule],
  controllers: [AccountsController],
  providers: [AccountsService, Reflector],
})
export class AccountsModule {}
