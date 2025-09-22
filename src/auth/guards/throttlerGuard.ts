import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // If authenticated, use user id
    if (req.user && req.user.userId) {
      console.log(req.user.userId, 'requesterrId');

      return req.user.userId;
    }
    console.log(req.ip, 'requesterrIp');
    // Fallback to IP if not logged in
    return req.ip;
  }
}
