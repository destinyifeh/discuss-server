import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import slugify from 'slugify';
export interface PostImage {
  secure_url: string;
  public_id: string;
}

export class CreatePostDto {
  @IsString()
  title: string;

  @IsString()
  @MinLength(20, {
    message: 'Content must be at least 20 characters long',
  })
  content: string;

  @IsString()
  section: SectionName;

  @IsOptional()
  @IsBoolean()
  commentsClosed?: boolean;
}

export class UpdatePostDto {
  title?: string;
  content?: string;
  section?: SectionName;
  removedImageIds?: string[];
}

export type SectionName =
  | 'Technology'
  | 'Travel'
  | 'Food'
  | 'Sports'
  | 'Politics'
  | 'Education'
  | 'Religion'
  | 'Romance'
  | 'Jobs'
  | 'News'
  | 'Entertainment'
  | 'Celebrity'
  | 'Health'
  | 'Properties'
  | 'Family'
  | 'Autos'
  | 'Business'
  | 'Science'
  | 'Finance'
  | 'Culture';
export interface GetPostsParams {
  page: number;
  limit: number;
  search?: string;
  userId: string;
}

export enum UserPostType {
  POSTS = 'posts',
  REPLIES = 'replies',
  LIKES = 'likes',
  MENTIONS = 'mentions',
}

export enum PostStatus {
  PUBLISHED = 'published',
  PROMOTED = 'promoted',
}

export function generateSlugFromContent(content: string): string {
  // Remove HTML tags
  const plainContent = content.replace(/<[^>]*>/g, '');

  // Split into words
  const words = plainContent.split(/\s+/);

  // Remove words that are URLs or start with http/https/www
  const filteredWords = words.filter(
    (w) => !/^https?:\/\//i.test(w) && !/^www\./i.test(w),
  );

  // Take first 12 safe words
  const safeWords = filteredWords.slice(0, 12).join(' ') || 'post';

  // Slugify
  return slugify(safeWords, { lower: true, strict: true });
}
