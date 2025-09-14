import { ForbiddenException, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AccountStatus } from 'src/common/utils/types/user.type';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(email, password);

    if (user.status === AccountStatus.SUSPENDED) {
      const now = new Date();
      if (user.suspendedUntil && now > user.suspendedUntil) {
        // Auto-unsuspend
        user.status = AccountStatus.ACTIVE;
        user.suspendedUntil = null;
        user.suspensionReason = null;

        // Optional: push to history log
        user.statusHistory.push({
          action: 'unsuspend',
          performedBy: 'system_local_validation',
          performedAt: now,
          reason: 'Suspension expired automatically',
        });

        await user.save();
      } else {
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
    }

    if (user.status === AccountStatus.BANNED) {
      throw new ForbiddenException(
        'Your account has been banned due to a violation of our terms. Contact support at support@example.com for more information.',
      );
    }
    return user;
  }
}
