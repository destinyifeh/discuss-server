import {
  BadRequestException,
  HttpStatus,
  ParseFilePipeBuilder,
} from '@nestjs/common';
import { maxFileSize } from '../constants/file.constant';

export const AvatarValidationPipe = new ParseFilePipeBuilder()
  .addMaxSizeValidator({
    maxSize: maxFileSize,
  })
  .build({
    fileIsRequired: false,
    errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    exceptionFactory: (errors) => {
      return new BadRequestException(
        'File too large. Maximum allowed size is 5MB.',
      );
    },
  });
