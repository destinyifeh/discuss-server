import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: RedisClientType;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    this.client = createClient({
      username: this.configService.get<string>('REDIS_USERNAME') ?? 'default',
      password: this.configService.get<string>('REDIS_PASSWORD') ?? '',
      socket: {
        host: this.configService.get<string>('REDIS_HOST') ?? 'localhost',
        port: Number(this.configService.get<string>('REDIS_PORT') ?? 6379),
        reconnectStrategy: (retries) => {
          console.warn(`🔄 Redis reconnect attempt #${retries}`);
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this.client.on('connect', () => {
      console.log('✅ Redis connected');
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error', err);
    });

    await this.client.connect();
  }

  getClient() {
    return this.client;
  }

  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
    }
  }
}
