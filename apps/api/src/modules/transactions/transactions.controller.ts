import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@app/modules/auth/guards/jwt.guard";
import { RolesGuard } from "@app/modules/auth/guards/roles.guard";
import { Roles } from "@app/modules/auth/decorators/roles.decorator";
import { CurrentUser } from "@app/modules/auth/decorators/current-user.decorator";
import { JwtPayload } from "@app/modules/auth/strategies/jwt.strategy";
import { TransactionsService } from "./transactions.service";
import { CreateTransferDto } from "./dto/create-transfer.dto";
import { IdempotencyKeyMissingException } from "./exceptions/idempotency-key-missing.exception";

@ApiTags("Transactions")
@Controller("transactions")
@UseGuards(JwtGuard, RolesGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post("transfer")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Crear transferencia entre cuentas" })
  @ApiHeader({ name: "X-Idempotency-Key", description: "UUID único por intento de transferencia", required: true })
  async transfer(
    @CurrentUser() user: JwtPayload,
    @Headers("x-idempotency-key") idempotencyKey: string,
    @Body() dto: CreateTransferDto,
  ) {
    if (!idempotencyKey?.trim()) throw new IdempotencyKeyMissingException();
    return this.transactionsService.createTransfer(user.sub, idempotencyKey.trim(), dto);
  }

  @Get()
  @ApiOperation({ summary: "Historial de transacciones del usuario autenticado" })
  getMyTransactions(
    @CurrentUser() user: JwtPayload,
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.transactionsService.getMyTransactions(user.sub, page, limit);
  }

  @Get("admin/account/:accountId")
  @Roles("ADMIN")
  @ApiOperation({ summary: "Historial de transacciones de una cuenta (solo admin)" })
  getAccountTransactions(
    @Param("accountId") accountId: string,
    @Query("page", new ParseIntPipe({ optional: true })) page = 1,
    @Query("limit", new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.transactionsService.getAccountTransactions(accountId, page, limit);
  }
}
