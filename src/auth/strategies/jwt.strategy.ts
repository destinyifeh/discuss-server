import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccountStatus } from 'src/common/utils/types/user.type';
import { User } from 'src/modules/users/schemas/user.schema';
import { jwtConstants } from '../constants';

// @Injectable()
// export class JwtStrategy extends PassportStrategy(Strategy) {
//   constructor() {
//     super({
//       jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
//       ignoreExpiration: false,
//       secretOrKey: jwtConstants.secret,
//     });
//   }

//   async validate(payload: any) {
//     return { userId: payload.sub, username: payload.username };
//   }
// }

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }

  async validate(payload: any) {
    const user = await this.userModel.findById(payload.sub);
    if (!user) throw new ForbiddenException('Invalid token');

    if (user.status === AccountStatus.BANNED) {
      throw new ForbiddenException('Your account has been permanently banned');
    }

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
          performedBy: 'system_jwt_validation',
          performedAt: now,
          reason: 'Suspension expired automatically',
        });

        await user.save();
      } else {
        throw new ForbiddenException('Your account is currently suspended');
      }
    }

    return {
      userId: user._id.toString(),
      username: user.username,
      roles: user.roles,
      user: user,
    };
  }
}
