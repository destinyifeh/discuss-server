import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AccountStatus } from 'src/common/utils/types/user.type';
import { User } from 'src/modules/users/schemas/user.schema';

interface JwtPayload {
  sub: string; // user ID
  username: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectModel(User.name) private readonly userModel: Model<User>) {
    const cookieExtractor = (req: Request): string | null => {
      return req.cookies?.encrypted_access_token ?? null; // match cookie name
    };
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
    });
  }

  async validate(payload: JwtPayload) {
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
      role: user.role,
    };
  }
}
