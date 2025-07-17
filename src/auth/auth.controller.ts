import {
  Body,
  Controller,
  Get,
  Param,
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
import { UploadApiResponse } from 'cloudinary';
import { Request, Response } from 'express';
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

  @Post('forgot-password')
  async forgotPass(@Body() data: ForgotPassDto) {
    return this.authService.forgotPassword(data.email);
  }

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
      req.cookies?.refreshToken || // cookie path=/auth/refresh-token
      req.body?.refreshToken || // fallback if body is sent.
      null;
    return this.authService.refreshToken(token, res);
  }

  @Post('register')
  @UseInterceptors(FileInterceptor('avatar', multerConfig))
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async registerUser(
    @Body() data: CreateUserDto,
    @UploadedFile(AvatarValidationPipe) avatar?: Express.Multer.File,
  ) {
    let result: UploadApiResponse | null = null;

    if (avatar) {
      result = await this.mediaUploadService.uploadImage(avatar);
    }
    return this.authService.registerUser(data, result);
  }
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

  @Get('google/login')
  @UseGuards(GoogleAuthGuard)
  async googleAuth() {}

  @Get('callback/google')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    // handle the successful Google login here
    const token = req.user as string;

    return res.redirect(
      `${process.env.CLIENT_URL}/callback/google?token=${token}`,
    );
  }
  @Get('google/user/:token')
  async getGoogleUser(
    @Param('token') token: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.getGoogleLoginUser(token, res);
  }
}
