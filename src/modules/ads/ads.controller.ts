import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
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
import { UploadApiResponse } from 'cloudinary';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AvatarValidationPipe } from 'src/common/utils/pipes/validatio.pipe';
import { AdStatus } from 'src/common/utils/types/ad.types';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from './../media-upload/media-upload.service';
import { AdsService } from './ads.service';
import { CreateAdDto, UpdateAdDto } from './dto/create-ad.dto';

@UseGuards(JwtAuthGuard)
@Controller('ad')
export class AdsController {
  constructor(
    private readonly adsService: AdsService,
    private readonly mediaUploadService: MediaUploadService,
  ) {}

  /* Create ad (requires login) */
  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createAd(
    @Body() dto: CreateAdDto,
    @CurrentUser() user: { userId: string },
    @UploadedFile(AvatarValidationPipe) image?: Express.Multer.File,
  ) {
    let result: UploadApiResponse | null = null;

    if (image) {
      result = await this.mediaUploadService.uploadImage(image);
    }

    return this.adsService.createAd(user.userId, dto, result);
  }

  /* Public list of active ads, optional ?section=home */
  @Get()
  findAll(@Query('section') section?: string) {
    return this.adsService.findAll(section);
  }

  /* Single ad (public) */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adsService.findOne(id);
  }

  /* Update ad (author or admin) */
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAdDto) {
    return this.adsService.update(id, dto);
  }

  /* Change status (admin endpoint) */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status/:status')
  changeStatus(@Param('id') id: string, @Param('status') status: AdStatus) {
    return this.adsService.changeStatus(id, status);
  }

  /* Remove ad (author or admin) */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.adsService.remove(id);
  }
}
