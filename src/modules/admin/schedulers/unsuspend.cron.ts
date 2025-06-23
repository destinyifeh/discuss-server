import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AdminService } from '../admin.service';

@Injectable()
export class UnsuspendCron {
  constructor(private readonly adminService: AdminService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  handleCron() {
    return this.adminService.clearExpiredSuspensions();
  }
}
