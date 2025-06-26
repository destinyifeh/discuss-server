import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('posts/:id/report')
  reportPost(
    @Param('id') postId: string,
    @Request() req,
    @Body() dto: CreateReportDto,
  ) {
    const user = req.user.userId;
    return this.reportsService.reportPost(postId, user, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comments/:id/report')
  reportComment(
    @Param('id') commentId: string,
    @Request() req,
    @Body() dto: CreateReportDto,
  ) {
    const user = req.user.userId;
    return this.reportsService.reportComment(commentId, user, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ads/:id/report')
  reportAd(
    @Param('id') adId: string,
    @Request() req,
    @Body() dto: CreateReportDto,
  ) {
    const user = req.user.userId;
    return this.reportsService.reportAd(adId, user, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/:id/report')
  reportUser(
    @Param('id') targetUserId: string,
    @Request() req,
    @Body() dto: CreateReportDto,
  ) {
    const user = req.user.userId;
    return this.reportsService.reportUser(targetUserId, user, dto.reason);
  }

  @UseGuards(JwtAuthGuard)
  @Post('report-abuse')
  reportAbuse(@Request() req, @Body() dto: CreateReportDto) {
    const user = req.user.userId;
    return this.reportsService.reportAbuse(
      user,
      dto.reason,
      dto.abuseCategory,
      dto.isAnonymous,
    );
  }

  @Post('users/:id/warn')
  warn(@Param('id') userId: string, @Body('reason') reason: string) {
    return this.reportsService.warnUser(userId, reason);
  }

  @Patch('users/:id/warnings/:index/resolve')
  resolveWarn(
    @Param('id') userId: string,
    @Param('index') index: number,
    @Body('note') note?: string,
  ) {
    return this.reportsService.resolveWarning(userId, +index, note);
  }

  /* —— Reports —— */
  @Get('reports')
  listReports() {
    return this.reportsService.listOpenReports();
  }

  @Patch('reports/:id/close')
  closeReport(@Param('id') id: string, @Body('note') note: string) {
    return this.reportsService.closeReport(id, note);
  }
}
