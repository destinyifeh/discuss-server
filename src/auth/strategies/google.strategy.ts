import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import * as bcrypt from 'bcrypt';
import { Model } from 'mongoose';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AccountStatus } from 'src/common/utils/types/user.type';
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
    const email = profile.emails?.[0]?.value;
    if (!email) throw new UnauthorizedException('Google account has no email');

    const googleId = profile.id;
    const preferredUsername = profile.name?.givenName || `user${Date.now()}`;
    const avatar = profile.photos?.[0]?.value || null;

    try {
      // First, find by googleId
      let user = await this.authService.findByGoogleId(googleId);

      if (!user) {
        // Try linking with existing email
        user = await this.authService.findByEmail(email);

        if (!user) {
          // Check if username already exists (case-insensitive)
          const usernameTaken =
            await this.authService.findByUsername(preferredUsername);

          if (usernameTaken) {
            // Instead of rejecting, mark them as "pending username"
            user = await this.authService.registerGoogleUser({
              googleId,
              email,
              username: googleId, // no username yet
              avatar,
              status: AccountStatus.PENDING_USERNAME, // flag in schema
              password: googleId,
            });

            // Instead of giving full access, return special token
            // that frontend uses to redirect to /choose-username
            const token = this.authService.generateJwt(user);
            return token;
          }

          // Safe to register with preferred username
          user = await this.authService.registerGoogleUser({
            googleId,
            email,
            username: preferredUsername,
            avatar,
            password: googleId,
          });
        } else {
          // Existing email user → just link googleId
          user.googleId = googleId;

          if (!user.password) {
            user.password = await bcrypt.hash(googleId, 10);
          }
          await user.save();
        }
      }

      // Normal login flow
      const token = this.authService.generateJwt(user);
      return token;
    } catch (error) {
      console.error('Google Auth / User Registration failed:', error);
      throw new InternalServerErrorException('Authentication failed');
    }
  }
}
