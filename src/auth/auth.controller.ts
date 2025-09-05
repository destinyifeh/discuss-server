import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { USERS_AVATAR_FOLDER } from 'src/common/utils/constants/config';
import { AvatarValidationPipe } from 'src/common/utils/pipes/validatio.pipe';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from './../modules/media-upload/media-upload.service';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import {
  CreateUserDto,
  ForgotPassDto,
  ResetPassDto,
} from './dto/create-user.dto';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guards';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,

    private readonly mediaUploadService: MediaUploadService,
  ) {}

  @UseGuards(LocalAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response, // <-- Inject Response object
  ) {
    return this.authService.login(req.user, res);
  }

  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPass(@Body() data: ForgotPassDto) {
    return this.authService.forgotPassword(data.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body() data: ResetPassDto) {
    return this.authService.resetPassword(data.token, data.password);
  }

  //protected route
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }
  @Post('refresh-token')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token =
      req.cookies?.encrypted_refresh_token || // cookie path=/auth/refresh-token
      req.body?.encrypted_refresh_token || // fallback if body is sent.
      null;
    return this.authService.refreshToken(token, res);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async registerUser(
    @Body() data: CreateUserDto,
    @UploadedFile(AvatarValidationPipe) avatar?: Express.Multer.File,
  ) {
    let result: { key: string; url: string } | null = null;
    if (avatar) {
      result = await this.mediaUploadService.uploadFile(
        avatar,
        USERS_AVATAR_FOLDER,
      );
    }
    return this.authService.registerUser(data, result);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user: { userId: string },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const { currentPassword, password } = changePasswordDto;
    return this.authService.changePassword(
      user.userId,
      currentPassword,
      password,
    );
  }

  //Google auth

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // handle the successful Google login here
    const token = req.user as string;
    return this.authService.handleGoogleLogin(token, res);
  }

  @Get('google-user')
  @UseGuards(JwtAuthGuard)
  async getGoogleUser(
    @CurrentUser() user: { userId: string },
    @Res({ passthrough: true }) res: Response,
    @Req() req: Request,
  ) {
    return this.authService.getGoogleLoginUser(user.userId, res);
  }
}
