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
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AdStatus } from 'src/common/utils/types/ad.types';
import { AdsService } from './ads.service';
import { CreateAdDto, UpdateAdDto } from './dto/create-ad.dto';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  /* Create ad (requires login) */
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() dto: CreateAdDto) {
    const user = req.user.userId;
    return this.adsService.create(user, dto);
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
