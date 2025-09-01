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
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import {
  FileFieldsInterceptor,
  FileInterceptor,
} from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from 'src/auth/auth.service';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { USERS_AVATAR_FOLDER } from 'src/common/utils/constants/config';
import { AvatarValidationPipe } from 'src/common/utils/pipes/validatio.pipe';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { ProfileUploadTypeDto } from './dto/profile-upload-type.dto';
import { MailUserDto, UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('user')
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
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('mail')
  mailUser(@CurrentUser() user: { userId: string }, @Body() dto: MailUserDto) {
    return this.usersService.mailUser(dto);
  }

  @Get('users')
  getUsers() {
    return this.usersService.getUsers();
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('profile-update')
  @UseGuards(JwtAuthGuard)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'cover_avatar', maxCount: 1 },
      ],
      // { limits: { fileSize: 5 * 1024 * 1024 } }, // 5 MB each (optional)
      multerConfig,
    ),
  )
  async updateUser(
    @CurrentUser() user: { userId: string },
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFiles()
    files?: {
      avatar?: Express.Multer.File[];
      cover_avatar?: Express.Multer.File[];
    },
  ) {
    const avatarFile = files?.avatar?.[0];
    const coverFile = files?.cover_avatar?.[0];

    return this.usersService.updateUser(
      user.userId,
      updateUserDto,
      avatarFile,
      coverFile,
    );
  }

  //protected route
  @UseGuards(JwtAuthGuard)
  @Get('check-user/:username')
  doesUserExistByUsername(
    @CurrentUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.doesUserExistByUsername(username);
  }

  @Get('user/:id')
  getUser(@Param('id') id: string) {
    return this.usersService.getUser(id);
  }

  @Delete('user/:id')
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }

  //protected route
  @UseGuards(JwtAuthGuard)
  @Get(':username')
  getUserByUsername(
    @CurrentUser() user: { userId: string },
    @Param('username') username: string,
  ) {
    return this.usersService.getUserByUsername(username);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('user/profile-upload/:id')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  async updateUserPhoto(
    @Param('id') id: string,
    @Body(new ValidationPipe()) body: ProfileUploadTypeDto,
    @UploadedFile(AvatarValidationPipe) avatar: Express.Multer.File,
  ) {
    const result = await this.mediaUploadService.uploadFile(
      avatar,
      USERS_AVATAR_FOLDER,
    );

    return this.usersService.updateUserPhoto(id, body.fileType, result);
  }
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch(':targetId/follow')
  async follow(
    @Param('targetId') targetId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.usersService.followUser(user.userId, targetId);
  }
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Put(':id/unfollow')
  async unfollow(
    @Param('id') targetUserId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.usersService.unfollowUser(user.userId, targetUserId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username/following')
  async getFollowing(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getFollowing(username, page, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':username/followers')
  async getFollowers(
    @Param('username') username: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.usersService.getFollowers(username, page, limit);
  }
}
