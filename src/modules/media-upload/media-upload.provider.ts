import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

export const MediaUploadProvider = {
  provide: 'CLOUDINARY',
  useFactory: (configService: ConfigService) => {
    cloudinary.config({
      cloud_name: configService.get<string>('UPLOAD_CLOUD_NAME'),
      api_key: configService.get<string>('UPLOAD_API_KEY'),
      api_secret: configService.get<string>('UPLOAD_API_SECRET'),
    });
    return cloudinary;
  },
  inject: [ConfigService],
};
