import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtGuard } from "@app/modules/auth/guards/jwt.guard";
import { CurrentUser } from "@app/modules/auth/decorators/current-user.decorator";
import { JwtPayload } from "@app/modules/auth/strategies/jwt.strategy";
import { AccountsService } from "./accounts.service";

@Controller("accounts")
@UseGuards(JwtGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get("me")
  getMyAccount(@CurrentUser() user: JwtPayload) {
    return this.accountsService.getMyAccount(user.sub);
  }
}
