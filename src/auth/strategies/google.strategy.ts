import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/modules/users/schemas/user.schema';
import { UsersService } from 'src/modules/users/users.service';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_BASE_URL}/auth/google/callback`,
      scope: ['profile', 'email'],
    });
  }

  authorizationParams(): { [key: string]: string } {
    return {
      prompt: 'select_account',
    };
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    // Extract safe profile fields
    const email = profile.emails?.[0]?.value;
    if (!email) throw new UnauthorizedException('Google account has no email');

    const googleId = profile.id;
    const username = profile.name?.givenName;
    const avatar = profile.photos?.[0]?.value || null;

    try {
      // First, find by googleId
      let user = await this.authService.findByGoogleId(googleId);

      if (!user) {
        // If no googleId found, maybe link by email (optional)
        user = await this.authService.findByEmail(email);

        if (!user) {
          // New user, register
          user = await this.authService.registerGoogleUser({
            googleId,
            email,
            username,
            avatar,
            password: googleId, // you might not need this at all for OAuth users
          });
        } else {
          // Existing email-based user → link googleId
          user.googleId = googleId;
          await user.save();
        }
      }

      const token = this.authService.generateJwt(user);
      return token;
    } catch (error) {
      console.error('Google Auth / User Registration failed:', error);
      throw new InternalServerErrorException('Authentication failed');
    }
  }
}
