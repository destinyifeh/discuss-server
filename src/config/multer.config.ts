import { BadRequestException } from '@nestjs/common';

import * as multer from 'multer';
import { extname } from 'path';
import { maxFileSize, validMimeTypes } from 'src/common/utils/constants/config';

function fileFilter(req, file, cb) {
  if (!validMimeTypes.includes(file.mimetype)) {
    const error = new BadRequestException(
      'Invalid file type. Only JPEG, JPG and PNG are allowed.',
    );
    return cb(error, false);
  }
  cb(null, true);
}

export const multerConfig2 = {
  storage: multer.diskStorage({
    // destination: './uploads',
    filename: (req, file, cb) => {
      const randomName =
        Date.now() + '-' + Math.round(Math.random() * 1e9).toString(36);
      cb(null, `${randomName}${extname(file.originalname)}`);
    },
  }),
  fileFilter: fileFilter,
  limits: { fileSize: maxFileSize }, // 5MB
};

export const multerConfig = {
  storage: multer.memoryStorage(), // stores file in memory as buffer
  fileFilter,
  limits: { fileSize: maxFileSize },
};
