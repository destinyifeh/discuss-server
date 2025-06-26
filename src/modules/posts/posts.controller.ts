import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { UploadApiResponse } from 'cloudinary';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from '../media-upload/media-upload.service';
import { CreatePostDto, UpdatePostDto } from './dto/create-post.dto';
import { PostsService } from './posts.service';

@Controller('post')
export class PostsController {
  constructor(
    private readonly mediaUploadService: MediaUploadService,
    private readonly postsService: PostsService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('files', 4, multerConfig))
  async cratePost(
    @Body() data: CreatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let result: UploadApiResponse[] | null = null;
    if (files?.length > 0) {
      result = await Promise.all(
        files.map((f) => this.mediaUploadService.uploadImage(f)),
      );
    }
    return this.postsService.createPost(data, result);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('files', 4, multerConfig))
  async updatePost(
    @Param('id') id: string,
    @Body() data: UpdatePostDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    let result: UploadApiResponse[] | null = null;
    if (files?.length > 0) {
      result = await Promise.all(
        files.map((f) => this.mediaUploadService.uploadImage(f)),
      );
    }
    return this.postsService.updatePost(id, data, result);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deletePost(@Param('id') id: string) {
    return this.postsService.deletePost(id);
  }
  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  likePost(@Param('id') postId: string, @Request() req) {
    const userId = req.user.userId;
    return this.postsService.toggleLike(postId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/bookmark')
  bookmarkPost(@Param('id') postId: string, @Request() req) {
    const userId = req.user.userId;
    return this.postsService.toggleBookmark(postId, userId);
  }

  @Post(':id/view')
  viewPost(@Param('id') postId: string) {
    return this.postsService.incrementViews(postId);
  }

  @Patch(':id/comments/close')
  @UseGuards(JwtAuthGuard)
  async closeComments(@Param('id') postId: string) {
    return this.postsService.toggleComments(postId, true);
  }

  @Patch(':id/comments/open')
  @UseGuards(JwtAuthGuard)
  async openComments(@Param('id') postId: string) {
    return this.postsService.toggleComments(postId, false);
  }

  @Get(':id')
  async getPost(@Param('id') id: string) {
    return this.postsService.getPostById(id);
  }
}
