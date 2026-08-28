import { Module } from "@nestjs/common";
import { AuthModule } from "@app/modules/auth/auth.module";
import { RolesGuard } from "@app/modules/auth/guards/roles.guard";
import { TransactionsController } from "./transactions.controller";
import { TransactionsService } from "./transactions.service";
import { AntiFraudService } from "./services/anti-fraud.service";

@Module({
  imports: [AuthModule],
  controllers: [TransactionsController],
  providers: [TransactionsService, AntiFraudService, RolesGuard],
})
export class TransactionsModule {}
