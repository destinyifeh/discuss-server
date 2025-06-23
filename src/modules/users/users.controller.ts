import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AvatarValidationPipe } from 'src/common/utils/pipes/validatio.pipe';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { ProfileUploadTypeDto } from './dto/profile-upload-type.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly mediaUploadService: MediaUploadService,
  ) {}

  @Get('all-users')
  getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('sortBy') sortBy?: 'asc' | 'desc',
    @Query('joinedAfter') joinedAfter?: string,
    @Query('joinedBefore') joinedBefore?: string,
  ) {
    return this.usersService.getAllUsers({
      page,
      limit,
      search,
      role,
      sortBy,
      joinedAfter,
      joinedBefore,
    });
  }

  @Get('user/:id')
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }
  @Get('users')
  getUsers() {
    return this.usersService.getUsers();
  }

  @Delete('user/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  @Put('user/:id')
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUser(id, updateUserDto);
  }

  //protected route
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @Patch('user/profile-upload/:id')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async updateUserPhoto(
    @Param('id') id: string,
    @Body(new ValidationPipe()) body: ProfileUploadTypeDto,
    @UploadedFile(AvatarValidationPipe) avatar: Express.Multer.File,
  ) {
    const result = await this.mediaUploadService.uploadImage(avatar, 'dee');

    return this.usersService.updateUserPhoto(id, body.fileType, result);
  }
  @UseGuards(JwtAuthGuard)
  @Put(':id/follow')
  async follow(
    @Param('id') targetUserId: string,
    @Request() req: any, // Replace with custom user decorator if applicable
  ) {
    const currentUserId = req.user.userId;
    return this.usersService.followUser(currentUserId, targetUserId);
  }
  @UseGuards(JwtAuthGuard)
  @Put(':id/unfollow')
  async unfollow(@Param('id') targetUserId: string, @Request() req: any) {
    const currentUserId = req.user.userId;
    return this.usersService.unfollowUser(currentUserId, targetUserId);
  }
}
