import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtGuard } from "@app/modules/auth/guards/jwt.guard";
import { RolesGuard } from "@app/modules/auth/guards/roles.guard";
import { Roles } from "@app/modules/auth/decorators/roles.decorator";
import { CurrentUser } from "@app/modules/auth/decorators/current-user.decorator";
import { JwtPayload } from "@app/modules/auth/strategies/jwt.strategy";
import { AccountsService } from "./accounts.service";
import { ListAccountsDto } from "./dto/list-accounts.dto";

@Controller("accounts")
@UseGuards(JwtGuard, RolesGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get("me")
  getMyAccount(@CurrentUser() user: JwtPayload) {
    return this.accountsService.getMyAccount(user.sub);
  }

  @Get()
  @Roles("ADMIN")
  listAccounts(@Query() dto: ListAccountsDto) {
    return this.accountsService.listAccounts(dto);
  }
}
