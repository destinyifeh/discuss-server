// create-comment.dto.ts
import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class QuotedCommentDto {
  @IsString()
  quotedContent: string;

  @IsString()
  quotedUser: string;

  @IsOptional()
  @IsString()
  quotedId?: string;

  @IsOptional()
  @IsString()
  quotedUserId: string;

  @IsOptional()
  @IsArray()
  quotedImage?: string[];

  @IsString()
  quotedContentCreatedDate: string;
}

export class CreateCommentDto {
  @IsNotEmpty() @IsString() postId: string;
  @IsNotEmpty() @IsString() content: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => QuotedCommentDto)
  quotedComment?: QuotedCommentDto;
}

export class UpdateCommentDto {
  @IsString()
  content: string;
  @IsString()
  postId: string;
  removedImageIds?: string[];
}

export interface CommentImage {
  secure_url: string;
  public_id: string;
}

export interface QuotedCommentProps {
  quotedContent: string;
  quotedUser: string;
  quotedId?: string;
  quotedUserId?: string;
  quotedImage?: string[];
  quotedContentCreatedDate?: string;
}
