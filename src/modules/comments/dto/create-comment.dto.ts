// create-comment.dto.ts
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty() @IsString() postId: string;
  @IsNotEmpty() @IsString() content: string;
}

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  keepImage?: boolean; // true = keep old image, false = remove
}
