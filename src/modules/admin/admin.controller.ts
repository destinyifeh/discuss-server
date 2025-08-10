import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
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

  @Get('post-stats')
  async getPostStats() {
    return this.adminService.getPostStats();
  }

  @Get('section-post-comment-stats')
  async getSectionPostCommentStats() {
    return this.adminService.getSectionPostCommentStats();
  }

  @Get('users')
  async getPaginatedUsers(
    @Query('search') search: string,
    @Query('status') status: 'active' | 'inactive' | 'suspended',
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminService.getAllUsersWithPostCount(
      Number(page),
      Number(limit),
      search,
      status,
    );
  }

  @Get('user-stats')
  async getUserStats() {
    return this.adminService.getUserStats();
  }

  @Get('user-distribution')
  async getUserDistribution() {
    return this.adminService.getUserDistribution();
  }

  @Get('user-distribution-and-stats')
  async getUserDistributionAndStats() {
    return this.adminService.getUserDistributionAndStats();
  }

  @Patch('users/:id/action')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.USER)
  userAction(
    @Param('id') id: string,
    @Body() dto: AccountRestrictionDto,
    @CurrentUser() user: { username: string },
  ) {
    const performedBy = user.username; // adjust if using different payload
    return this.adminService.accountRestrictionAction(id, dto, performedBy);
  }

  @Patch('update-role/:userId')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  async updateUserRole(
    @Query('role', new ParseEnumPipe(Role)) role: Role,
    @Param('userId') userId: string,
  ) {
    return this.adminService.updateUserRole(role, userId);
  }
}
