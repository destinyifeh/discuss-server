import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  v2 as Cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';

@Injectable()
export class MediaUploadService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary,
  ) {}

  async uploadImage(
    file: Express.Multer.File,
    folder = 'dee',
  ): Promise<UploadApiResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File buffer is empty');
    }

    return new Promise((resolve, reject) => {
      this.cloudinary.uploader
        .upload_stream(
          { folder },
          (
            error: UploadApiErrorResponse | undefined,
            result: UploadApiResponse | undefined,
          ) => {
            if (error) {
              console.log(error, 'upload err');
              return reject(new Error(error.message));
            }
            if (!result) {
              return reject(new Error('No response from Cloudinary'));
            }
            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  async deleteImage(publicId: string): Promise<{ result: string }> {
    return new Promise((resolve, reject) => {
      this.cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) return reject(new Error(error.message));
        resolve(result as { result: string });
      });
    });
  }

  /** Delete multiple images by array of public_ids */
  async deleteImages(
    publicIds: string[],
  ): Promise<{ deleted: Record<string, string> }> {
    if (!publicIds.length) {
      throw new BadRequestException('No publicIds provided');
    }

    return new Promise((resolve, reject) => {
      this.cloudinary.api.delete_resources(publicIds, (error, result) => {
        if (error) {
          console.log(error, 'errrorClud');
          return reject(new Error(error.message));
        }
        resolve(result as { deleted: Record<string, string> });
      });
    });
  }
}
