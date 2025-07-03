import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { UploadApiResponse } from 'cloudinary';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { MailService } from 'src/mail/mail.service';
import { MailerService } from 'src/mailer/mailer.service';
import { User } from 'src/modules/users/schemas/user.schema';
import { UsersService } from 'src/modules/users/users.service';
import { generateUrlTokenLink, jwtConstants } from './constants';
import { CreateUserDto } from './dto/create-user.dto';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,

    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly mailService: MailService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  generateJwt(user) {
    const payload = {
      sub: user._id,
      email: user.email,
    };
    return this.jwtService.sign(payload);
  }

  async generateRefreshJwt(user) {
    const payload = {
      sub: user._id,
      email: user.email,
    };

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: '7d',
    });

    await this.updateRefreshToken(user._id, refreshToken);

    return refreshToken;
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
  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    return this.userModel
      .findByIdAndUpdate(userId, { refreshToken: hashed })
      .exec();
  }

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.userModel
      .findOne({ username })
      .lean() // plain JS object (not Mongoose doc)
      .exec();
    console.log(user, 'user');

    if (!user) throw new NotFoundException('User not found');

    const ok = await bcrypt.compare(pass, user.password);
    if (!ok) {
      throw new NotFoundException('Incorrect password');
    }

    const { password, refreshToken, ...safeUser } = user;
    return safeUser;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user._id };

    // const accessToken = this.jwtService.sign(payload, {
    //   secret: jwtConstants.secret,
    //   expiresIn: '15m',
    // });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConstants.refreshSecret,
      expiresIn: '7d',
    });
    // Save hashed refresh token in DB
    await this.updateRefreshToken(user._id, refreshToken);

    // return {
    //   access_token: this.jwtService.sign(payload),
    // };
    return {
      access_token: this.jwtService.sign(payload),
      refresh_token: refreshToken,
      user: user,
    };
  }

  async refreshToken(token: string): Promise<any> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: jwtConstants.refreshSecret,
      });

      const user = await this.userModel.findById(payload.sub).exec();

      if (!user) {
        throw new ForbiddenException('User not found');
      }

      const isMatch = await bcrypt.compare(token, user.refreshToken);
      if (!isMatch) throw new ForbiddenException('Invalid refresh token');

      const newAccessToken = { username: user.username, sub: user._id };
      return {
        access_token: this.jwtService.sign(newAccessToken),
      };
    } catch (err) {
      console.log(err);
      throw new ForbiddenException('Refresh token expired or invalid');
    }
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
    await this.mailService.sendWith('gmail', email, 'Hello!', 'forgot-pass', {
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

  async registerUser(data: CreateUserDto, avatar?: UploadApiResponse | null) {
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
        avatar: avatar?.secure_url ?? null,
        avatar_public_id: avatar?.public_id ?? null,
      });

      const savedUser = await createdUser.save();

      console.log('Saved User:', savedUser);

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

  async registerGoogleUser(
    data: CreateUserDto,
    avatar?: UploadApiResponse | null,
  ): Promise<User> {
    try {
      console.log('Data:', data);
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const createdUser = new this.userModel({
        ...data,
        password: hashedPassword,
        avatar: avatar?.secure_url ?? null,
        avatar_public_id: avatar?.public_id ?? null,
      });

      const savedUser = await createdUser.save();

      console.log('Saved User:', savedUser);
      return savedUser;
    } catch (err) {
      console.error('Error registering user:', err);
      throw new InternalServerErrorException('Registration failed');
    }
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
