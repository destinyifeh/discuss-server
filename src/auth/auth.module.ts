import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';

import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { PassportModule } from '@nestjs/passport';
import { MailModule } from 'src/mail/mail.module';
import { MailerModule } from 'src/mailer/mailer.module';
import { MediaUploadModule } from 'src/modules/media-upload/media-upload.module';
import { User, UserSchema } from 'src/modules/users/schemas/user.schema';
import { UsersModule } from 'src/modules/users/users.module';
import { AuthController } from './auth.controller';
import { jwtConstants } from './constants';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => UsersModule),
    MediaUploadModule,
    MailerModule,
    MailModule,
    PassportModule,
    JwtModule.register({
      secret: jwtConstants.secret,
      signOptions: { expiresIn: '5m' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, GoogleStrategy],
  exports: [AuthService],
})
export class AuthModule {}
