import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  v2 as Cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class MediaUploadService {
  private s3: S3Client;
  private readonly bucketName: string;
  private readonly region: string;
  private readonly accessId: string;
  private readonly secretAccessKey: string;
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinary: typeof Cloudinary,
    private readonly configService: ConfigService,
  ) {
    this.accessId = process.env.AWS_ACCESS_KEY_ID as string;
    this.region = process.env.AWS_REGION as string;
    this.secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY as string;
    this.bucketName = process.env.AWS_S3_BUCKET as string;

    this.s3 = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.accessId,
        secretAccessKey: this.secretAccessKey,
      },
    });
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) throw new Error(`${key} is missing`);
    return value;
  }

  // Generate S3 URL
  private getFileUrl(key: string) {
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  // ✅ Upload single file
  async uploadFile(file: Express.Multer.File, folder: string) {
    const key = `${folder}/${Date.now()}-${randomUUID()}-${file.originalname}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return { key, url: this.getFileUrl(key) };
  }

  // ✅ Upload multiple files to folder
  async uploadMultipleFiles(files: Express.Multer.File[], folder: string) {
    return Promise.all(files.map((file) => this.uploadFile(file, folder)));
  }

  // ✅ Delete single file
  async deleteFile(key: string) {
    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
    return { deleted: key };
  }

  // ✅ Delete multiple files
  async deleteFiles(keys: string[]) {
    if (!keys.length) return { deleted: [] };

    await this.s3.send(
      new DeleteObjectsCommand({
        Bucket: this.bucketName,
        Delete: {
          Objects: keys.map((key) => ({ Key: key })),
        },
      }),
    );
    return { deleted: keys };
  }

  // ✅ Update single file (delete old, upload new)
  async updateFile(
    oldKey: string,
    newFile: Express.Multer.File,
    folder: string,
  ) {
    // Delete old file
    await this.deleteFile(oldKey);

    // Upload new file
    return this.uploadFile(newFile, folder);
  }

  // ✅ Update multiple files
  async updateMultipleFiles(
    oldKeys: string[],
    newFiles: Express.Multer.File[],
    folder: string,
  ) {
    // Delete all old files
    await this.deleteFiles(oldKeys);

    // Upload new files
    return this.uploadMultipleFiles(newFiles, folder);
  }

  //cloudinary

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
