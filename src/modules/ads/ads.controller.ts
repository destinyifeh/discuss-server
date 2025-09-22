import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserThrottlerGuard } from 'src/auth/guards/throttlerGuard';
import { ADS_IMAGE_FOLDER } from 'src/common/utils/constants/config';
import { AvatarValidationPipe } from 'src/common/utils/pipes/validatio.pipe';
import { AdStatus } from 'src/common/utils/types/ad.types';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from './../media-upload/media-upload.service';
import { AdsService } from './ads.service';
import { AdPlacementProps, CreateAdDto } from './dto/create-ad.dto';

@Controller('ad')
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly mediaUploadService: MediaUploadService,
  ) {}

  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createAd(
    @Body() dto: CreateAdDto,
    @CurrentUser() user: { userId: string },
    @UploadedFile(AvatarValidationPipe) image?: Express.Multer.File,
  ) {
    let result: { key: string; url: string } | null = null;

    if (image) {
      result = await this.mediaUploadService.uploadFile(
        image,
        ADS_IMAGE_FOLDER,
      );
    }

    return this.adsService.createAd(user.userId, dto, result);
  }

  @Get()
  async getAds(
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adsService.getAds(page, limit, search);
  }

  @Get('count-by-Status')
  async getCountAdByStatus(@Query('status') status: AdStatus) {
    return this.adsService.getCountAdByStatus(status);
  }

  @Get('user-ads')
  @UseGuards(JwtAuthGuard)
  async getUserAdByStatus(
    @CurrentUser() user: { userId: string },
    @Query('status') status: AdStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adsService.getUserAdByStatus(
      status,
      user.userId,
      page,
      limit,
      search,
    );
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  async initialize(
    @Body() body: { email: string; amount: number; otherDetails: any },
  ) {
    return this.adsService.initializeTransaction(
      body.email,
      body.amount,
      body.otherDetails,
    );
  }

  @Get('verify')
  async verify(@Query('reference') reference: string) {
    return this.adsService.verifyTransaction(reference);
  }

  @Get('banner-ads')
  async getBannerAds(
    @Query('placement') placement: AdPlacementProps,
    @Query('section') section?: string,
  ) {
    return this.adsService.getBannerAds(placement, section);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':adId/pause/:adOwnerId')
  pauseAd(
    @Param('adId') adId: string,
    @Param('adOwnerId') adOwnerId: string,
    @Body() dto: { reason: string },
  ) {
    return this.adsService.pauseAd(adId, dto.reason, adOwnerId);
  }

  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':adId/approve/:adOwnerId')
  approveAd(
    @Param('adId') adId: string,
    @Param('adOwnerId') adOwnerId: string,
  ) {
    return this.adsService.approveAd(adId, adOwnerId);
  }

  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':adId/activate/:adOwnerId')
  activateAd(
    @Param('adId') adId: string,
    @Param('adOwnerId') adOwnerId: string,
  ) {
    return this.adsService.activateAd(adId, adOwnerId);
  }

  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':adId/reject/:adOwnerId')
  rejectAd(
    @Param('adId') adId: string,
    @Param('adOwnerId') adOwnerId: string,
    @Body() dto: { reason: string },
  ) {
    return this.adsService.rejectAd(adId, dto.reason, adOwnerId);
  }
  @UseGuards(JwtAuthGuard, UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':adId/resume')
  reaumeAd(@Param('adId') adId: string) {
    return this.adsService.resumeAd(adId);
  }

  @Post(':adId/impressions')
  updateAdImpressions(@Param('adId') adId: string) {
    return this.adsService.updateAdImpressions(adId);
  }

  @Post(':adId/clicks')
  updateAdClicks(@Param('adId') adId: string) {
    return this.adsService.updateAdClicks(adId);
  }

  /* Remove ad (author or admin) */
  @UseGuards(JwtAuthGuard)
  @Delete(':id/delete')
  remove(@Param('id') id: string) {
    return this.adsService.deleteAd(id);
  }
}
