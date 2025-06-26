import {
  Body,
  Controller,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Role } from 'src/common/utils/types/user.type';
import { AdminService } from './admin.service';
import { Roles } from './decorators/role.decorator';
import { AccountRestrictionDto } from './dto/account-restriction.dto';
import { RolesGuard } from './guards/role.gurad';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Patch(':id/action')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  userAction(
    @Param('id') id: string,
    @Body() dto: AccountRestrictionDto,
    @Request() req,
  ) {
    const performedBy = req.user.username; // adjust if using different payload
    return this.adminService.accountRestrictionAction(id, dto, performedBy);
  }
}
