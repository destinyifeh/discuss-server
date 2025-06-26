import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';

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
      callbackURL: 'http://localhost:3000/auth/google/redirect',
      scope: ['profile', 'email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { emails, name, photos, id, dob, gender } = profile;

    let user = await this.authService.findByEmail(emails[0].value);

    if (!user) {
      user = await this.authService.registerGoogleUser({
        googleId: id,
        email: emails[0].value,
        username: name.givenName,
        dob: dob,
        gender: gender,
        password: id,
      });
    }

    const access_token = this.authService.generateJwt(user);
    const refresh_token = await this.authService.generateRefreshJwt(user);

    done(null, { user, access_token, refresh_token });
  }
}
