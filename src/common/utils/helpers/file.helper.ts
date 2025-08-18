import { BadRequestException } from '@nestjs/common';
import { maxFileSize, validMimeTypes } from '../constants/config';

export const validateFileUpload = (file: Express.Multer.File) => {
  if (!validMimeTypes.includes(file.mimetype)) {
    throw new BadRequestException(
      'Invalid file type. Only JPEG, PNG, JPG, and WEBP are allowed.',
    );
  }

  if (file.size > maxFileSize) {
    throw new BadRequestException('File is too large. Maximum size is 5MB.');
  }

  return true;
};

export const validateImageFile = (
  file: Express.Multer.File | Express.Multer.File[],
) => {
  // Handle single file or array of files
  const files = Array.isArray(file) ? file : [file];

  // Check if at least one file is provided
  if (files.length === 0) {
    throw new BadRequestException('No files uploaded');
  }

  for (const currentFile of files) {
    // Check file type
    if (!validMimeTypes.includes(currentFile.mimetype)) {
      throw new BadRequestException(
        `Invalid file type for ${currentFile.originalname}. Only JPEG, PNG, JPG, and WEBP are allowed.`,
      );
    }

    // Check file size
    if (currentFile.size > maxFileSize) {
      throw new BadRequestException(
        `File ${currentFile.originalname} is too large. Maximum size is 5MB.`,
      );
    }
  }

  return true;
};
