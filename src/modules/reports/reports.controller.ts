import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateReportDto } from './dto/create-report.dto';
import { ReportsService } from './reports.service';

@Controller('report')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  getReports(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.reportsService.getReports({ page, limit, search });
  }

  @UseGuards(JwtAuthGuard)
  @Post('post/:id')
  reportPost(
    @Param('id') postId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReportDto,
  ) {
    const body: CreateReportDto = {
      ...dto,
      post: postId,
      reportedBy: user.userId,
      reason: dto.reason,
    };
    return this.reportsService.reportPost(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comment/:id')
  reportComment(
    @Param('id') commentId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReportDto,
  ) {
    const body: CreateReportDto = {
      ...dto,
      comment: commentId,
      reportedBy: user.userId,
      reason: dto.reason,
    };
    return this.reportsService.reportComment(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('ad/:id')
  reportAd(
    @Param('id') adId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReportDto,
  ) {
    const body: CreateReportDto = {
      ...dto,
      ad: adId,
      reportedBy: user.userId,
      reason: dto.reason,
    };
    return this.reportsService.reportAd(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('user/:id')
  reportUser(
    @Param('id') targetUserId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReportDto,
  ) {
    const body: CreateReportDto = {
      ...dto,
      user: targetUserId,
      reportedBy: user.userId,
      reason: dto.reason,
    };
    return this.reportsService.reportUser(body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('abuse')
  reportAbuse(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateReportDto,
  ) {
    const body: CreateReportDto = {
      ...dto,
      reportedBy: user.userId,
      reason: dto.reason,
    };
    return this.reportsService.reportAbuse(body);
  }

  @Post(':userId/warn')
  @UseGuards(JwtAuthGuard)
  warn(
    @Param('userId') userId: string,
    @Body('message') message: string,
    @CurrentUser() currentUser: { userId: string },
  ) {
    return this.reportsService.warn(userId, currentUser.userId, message);
  }

  @Delete(':reportId/resolve')
  resolveWarn(@Param('reportId') reportId: string) {
    return this.reportsService.resolveWarning(reportId);
  }
}
