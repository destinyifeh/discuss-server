import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      username: this.configService.get<string>('REDIS_USERNAME') ?? 'default',
      password: this.configService.get<string>('REDIS_PASSWORD') ?? '',
      socket: {
        host: this.configService.get<string>('REDIS_HOST') ?? 'localhost',
        port: Number(this.configService.get<string>('REDIS_PORT') ?? 6379),
        reconnectStrategy: (retries) => {
          this.logger.warn(`🔄 Redis reconnect attempt #${retries}`);
          return Math.min(retries * 100, 3000); // backoff
        },
      },
    });

    this.client.on('connect', () => {
      this.logger.log('✅ Redis connected');
    });

    this.client.on('reconnecting', () => {
      this.logger.warn('♻️ Redis reconnecting...');
    });

    this.client.on('end', () => {
      this.logger.error('❌ Redis connection closed');
    });

    this.client.on('error', (err) => {
      this.logger.error('❌ Redis error', err);
    });

    try {
      await this.client.connect();
    } catch (err) {
      this.logger.error(
        '⚠️ Could not connect to Redis on startup, continuing without cache',
        err,
      );
      // Don't crash the app — client remains undefined or null
    }
  }

  getClient(): RedisClientType | null {
    return this.client?.isOpen ? this.client : null;
  }

  async onModuleDestroy() {
    if (this.client?.isOpen) {
      await this.client.quit();
    }
  }
}
