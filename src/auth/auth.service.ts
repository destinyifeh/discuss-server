import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { Response } from 'express';
import { Model } from 'mongoose';
import { capitalizeName } from 'src/common/utils/formatter';
import { AccountStatus } from 'src/common/utils/types/user.type';
import { toSafeUser } from 'src/common/utils/user.mapper';
import { MailService } from 'src/mail/mail.service';
import { User } from 'src/modules/users/schemas/user.schema';
import { UsersService } from 'src/modules/users/users.service';
import { NotificationsService } from 'src/notifications/notifications.service';
import {
  ACCESS_TOKEN_EXPIRATION_MS,
  generateUrlTokenLink,
  REFRESH_TOKEN_EXPIRATION_MS,
} from './constants';
import { CreateUserDto } from './dto/create-user.dto';
@Injectable()
export class AuthService {
  private readonly accessTokenKey: string;
  private readonly refreshTokenKey: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtRefreshTokenExpirationPeriod: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    this.accessTokenKey =
      this.configService.get<string>('ACCESS_TOKEN_KEY') ?? '';
    this.refreshTokenKey =
      this.configService.get<string>('REFRESH_TOKEN_KEY') ?? '';

    this.jwtRefreshSecret =
      this.configService.get<string>('JWT_REFRESH_SECRET') ?? '';
    this.jwtRefreshTokenExpirationPeriod =
      this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION_PERIOD') ??
      '';
  }

  generateJwt(user) {
    const payload = {
      sub: user._id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findUserByResetToken(token: string): Promise<any> {
    const users = await this.userModel
      .find({
        resetPasswordExpires: { $gt: new Date() },
      })
      .exec();

    for (const user of users) {
      if (!user.resetPasswordToken) continue;
      const isMatch = await bcrypt.compare(token, user.resetPasswordToken);
      if (isMatch) return user;
    }

    return null;
  }

  private setGoogleAuthTempCookie(res: Response, googleToken: string) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('google_temp_token', googleToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 5 * 60 * 1000, // expire in 5 mins
    });
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(this.accessTokenKey, accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax', // Adjust as needed: 'Strict', 'None' (requires secure: true)
      maxAge: ACCESS_TOKEN_EXPIRATION_MS, // in milliseconds
      path: '/',
    });
    res.cookie(this.refreshTokenKey, refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: REFRESH_TOKEN_EXPIRATION_MS, // in milliseconds
      path: '/',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie(this.accessTokenKey, { path: '/' });
    res.clearCookie(this.refreshTokenKey, { path: '/' });
  }

  private clearGoogleAuthTempCookie(res: Response) {
    res.clearCookie('google_temp_token', { path: '/' });
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    return this.userModel
      .findByIdAndUpdate(userId, { refreshToken: hashed })
      .exec();
  }

  private async clearUserStatusHistory(user: any) {
    if (user.status === AccountStatus.ACTIVE && user.statusHistory?.length) {
      const lastUnsuspend = user.statusHistory
        .filter((h: any) => h.action === 'unsuspend' || h.action === 'unban')
        .sort(
          (a: any, b: any) =>
            new Date(b.performedAt).getTime() -
            new Date(a.performedAt).getTime(),
        )[0];
      console.log(lastUnsuspend, 'lastSuspended');
      if (lastUnsuspend) {
        const now = new Date();
        const hoursSince =
          (now.getTime() - new Date(lastUnsuspend.performedAt).getTime()) /
          36e5;
        if (hoursSince >= 48) {
          user.statusHistory = [];
          await user.save();
        }
      }
    }
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userModel.findOne({ username }).exec();

    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) {
      throw new NotFoundException('Incorrect password');
    }
    this.clearUserStatusHistory(user);
    // const { password, refreshToken, ...safeUser } = user;
    return user;
  }

  async login(user: any, res: Response) {
    const payload = { username: user.username, sub: user._id };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshTokenExpirationPeriod,
    });
    // Save hashed refresh token in DB
    await this.updateRefreshToken(user._id, refreshToken);
    this.setAuthCookies(res, accessToken, refreshToken);

    const safeUser = toSafeUser(user);
    console.log(safeUser, 'destoo');
    return { user: safeUser, accessToken: accessToken };
  }

  async refreshToken(token: string, res: Response) {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.jwtRefreshSecret,
      });
      console.log(payload, 'payloadbver');
      const user = await this.userModel.findById(payload.sub).exec();

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) throw new ForbiddenException('Invalid refresh token');

      const newPayload = { username: user.username, sub: user._id };
      const accessToken = this.jwtService.sign(newPayload);
      const refreshToken = this.jwtService.sign(newPayload, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.jwtRefreshTokenExpirationPeriod,
      });
      this.setAuthCookies(res, accessToken, refreshToken);
      return {
        message: 'Refreshed',
        code: HttpStatus.OK,
      };
    } catch (err) {
      console.log(err);
      throw new ForbiddenException('Refresh token expired or invalid');
    }
  }

  logout(res: Response) {
    this.clearAuthCookies(res);
    return { message: 'Logged out successfully', code: '200' };
  }

  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');

    const token = randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(token, 10);

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 hour
    await user.save();
    // Choose ONE mailer
    // await this.mailerService.sendResetEmail(email, token);
    const link = generateUrlTokenLink(token);
    await this.mailService.sendWith('ses', email, 'Hello!', 'forgot-pass', {
      username: user.username,
      email: user.email,
      link: link,
      year: new Date().getFullYear(),
    });

    return { code: HttpStatus.OK, message: 'Reset link sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.findUserByResetToken(token);
    if (!user) throw new BadRequestException('Invalid or expired token');

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return { code: HttpStatus.OK, message: 'Password reset successful' };
  }

  async registerUser(
    data: CreateUserDto,
    avatar?: { url: string; key: string } | null,
  ) {
    try {
      console.log('Data:', data);

      // ① Early lookup
      const existing = await this.userModel.findOne({
        $or: [{ email: data.email }, { username: data.username }],
      });

      if (existing) {
        if (existing.email === data.email) {
          throw new ConflictException('Email is already in use');
        }
        if (existing.username === data.username) {
          throw new ConflictException('Username is already taken');
        }
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);
      const createdUser = new this.userModel({
        ...data,
        password: hashedPassword,
        avatar: avatar?.url ?? null,
        avatar_public_id: avatar?.key ?? null,
      });

      const savedUser = await createdUser.save();

      console.log('Saved User:', savedUser);

      await this.notificationsService.createNotification({
        type: 'admin',
        message: 'New user registration',
        content: `${capitalizeName(data.username)} joined the platform`,
        senderName: 'System',
      });

      return {
        code: HttpStatus.OK,
        message: 'success',
        data: savedUser,
      };
    } catch (err) {
      console.error('Error registering user:', err.message);
      if (err?.message === 'Email is already in use') {
        // Which field duplicated?
        throw new ConflictException('Email is already in use');
      }
      if (err?.message === 'Username is already taken') {
        throw new ConflictException('Username is already taken');
      }
    }

    throw new InternalServerErrorException('Registration failed');
  }

  async registerGoogleUser(data: any): Promise<User> {
    try {
      console.log('Data:', data);
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const createdUser = new this.userModel({
        ...data,
        password: hashedPassword,
      });

      const savedUser = await createdUser.save();

      console.log('Saved User:', savedUser);

      await this.notificationsService.createNotification({
        type: 'admin',
        message: 'New user registration',
        content: `${capitalizeName(data.username)} joined the platform`,
        senderName: 'System',
      });

      return savedUser;
    } catch (err) {
      console.error('Error registering user:', err);
      throw new InternalServerErrorException('Registration failed');
    }
  }

  async getGoogleLoginUser(userId: string, res: Response) {
    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    console.log(user, 'userMeett');

    const newPayload = { username: user.username, sub: user._id };
    const accessToken = this.jwtService.sign(newPayload);
    const refreshToken = this.jwtService.sign(newPayload, {
      secret: this.jwtRefreshSecret,
      expiresIn: this.jwtRefreshTokenExpirationPeriod,
    });

    // Save hashed refresh token in DB.
    await this.updateRefreshToken(user._id.toString(), refreshToken);

    //set cookies
    this.setAuthCookies(res, accessToken, refreshToken);

    //clear temp cookie
    this.clearGoogleAuthTempCookie(res);

    const safeUser = toSafeUser(user);

    return { user: safeUser };
  }

  async handleGoogleLogin(token: string, res: Response) {
    // 2. Set cookies (your helper method)
    this.setGoogleAuthTempCookie(res, token);

    // 3. Redirect to frontend
    return res.redirect(`${process.env.CLIENT_URL}/login/google/callback`);
  }

  async changePassword(id: string, oldPassword: string, newPassword: string) {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('No user found');
    }

    // Verify old password is correct
    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isOldPasswordValid) {
      throw new BadRequestException('Old password is incorrect');
    }

    // Ensure new password is not the same as the old one
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      throw new BadRequestException(
        'New password must be different from your current password.',
      );
    }

    // Update password
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return {
      code: HttpStatus.OK,
      message: 'Password updated',
    };
  }
}
