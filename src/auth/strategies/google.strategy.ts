import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';

import { UsersService } from 'src/modules/users/users.service';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: `${process.env.API_BASE_URL}/auth/google/callback`,
      scope: ['profile', 'email'],
    });
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
      // Find existing user or create one
      let user = await this.authService.findByEmail(email);

      user ??= await this.authService.registerGoogleUser({
        googleId,
        email,
        username,
        avatar,
        password: googleId,
      });

      const token = this.authService.generateJwt(user);
      return token;
    } catch (error) {
      console.error('Google Auth / User Registration failed:', error);
      throw new InternalServerErrorException('Authentication failed'); // Or a more specific exception
    }
  }
}
