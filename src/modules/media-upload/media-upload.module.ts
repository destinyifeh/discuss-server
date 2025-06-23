import { Module } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { MediaUploadProvider } from './media-upload.provider';
import { MediaUploadService } from './media-upload.service';

@Module({
  imports: [ConfigModule],
  providers: [MediaUploadProvider, MediaUploadService],
  exports: [MediaUploadService],
})
export class MediaUploadModule {}
