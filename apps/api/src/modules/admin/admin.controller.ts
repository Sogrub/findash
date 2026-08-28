import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "@app/modules/auth/guards/jwt.guard";
import { RolesGuard } from "@app/modules/auth/guards/roles.guard";
import { Roles } from "@app/modules/auth/decorators/roles.decorator";
import { AdminService } from "./admin.service";

@ApiTags("Admin")
@Controller("admin")
@UseGuards(JwtGuard, RolesGuard)
@Roles("ADMIN")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("metrics")
  @ApiOperation({ summary: "KPIs y volumen por tipo de cuenta (solo admin)" })
  getDashboardMetrics() {
    return this.adminService.getDashboardMetrics();
  }
}
