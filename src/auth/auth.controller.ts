import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadApiResponse } from 'cloudinary';
import { AvatarValidationPipe } from 'src/common/utils/pipes/validatio.pipe';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from './../modules/media-upload/media-upload.service';
import { AuthService } from './auth.service';
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
  async login(@Request() req) {
    return this.authService.login(req.user);
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
  getProfile(@Request() req) {
    return req.user;
  }
  @Post('refresh-token')
  async refresh(@Body() body: { refresh_token: string }) {
    const token = body.refresh_token;
    return this.authService.refreshToken(token);
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
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    const { oldPassword, newPassword } = changePasswordDto;
    return this.authService.changePassword(
      req.user.userId,
      oldPassword,
      newPassword,
    );
  }

  //Google auth

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleAuth(@Request() req) {
    // initiates the Google OAuth2 login flow
  }

  @Get('google/redirect')
  @UseGuards(GoogleAuthGuard)
  async googleAuthRedirect(@Request() req) {
    // handle the successful Google login here
    return {
      message: 'Google login successful',
      user: req.user,
    };
  }
}
