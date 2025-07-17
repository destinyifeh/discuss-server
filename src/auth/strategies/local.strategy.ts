import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AccountStatus } from 'src/common/utils/types/user.type';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super();
  }

  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);

    if (user.status === AccountStatus.SUSPENDED) {
      const suspensionEnd = user.suspendedUntil;
      const formattedDate = new Date(suspensionEnd).toLocaleDateString(
        'en-US',
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        },
      );

      throw new ForbiddenException(
        `Your account is currently suspended until ${formattedDate}`,
      );
    }

    if (user.status === AccountStatus.BANNED) {
      throw new ForbiddenException(
        'Your account has been banned due to a violation of our terms. Contact support at support@example.com for more information.',
      );
    }
    return user;
  }
}
