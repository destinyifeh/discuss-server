import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from '../media-upload/media-upload.service';

import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { COMMENTS_IMAGE_FOLDER } from 'src/common/utils/constants/config';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';
@UseGuards(JwtAuthGuard)
@Controller('comment')
export class CommentsController {
  constructor(
    private readonly commentService: CommentsService,
    private readonly mediaUploadService: MediaUploadService,
  ) {}

  @Post()
  @UseInterceptors(FilesInterceptor('images', 2, multerConfig))
  async createComment(
    @Body() body: any,
    @CurrentUser() user: { userId: string },
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    const parsedQuotedComment = body?.quotedComment
      ? JSON.parse(body.quotedComment)
      : null;

    const data: CreateCommentDto = {
      ...body,
      quotedComment: parsedQuotedComment,
    };
    let result: { key: string; url: string }[] | null = null;
    if (images && images?.length > 0) {
      result = await this.mediaUploadService.uploadMultipleFiles(
        images,
        COMMENTS_IMAGE_FOLDER,
      );
      console.log(result, 'resultttt');
      console.log(images, 'resultttimagert');
    }

    return this.commentService.create(data, user.userId, result);
  }

  @Get('post/:postId')
  async getComments(@Param('postId') postId: string) {
    return this.commentService.findByPost(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/like')
  async like(
    @Param('id') commentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const userId = user.userId;
    return this.commentService.like(commentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/dislike')
  async dislike(
    @Param('id') commentId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const userId = user.userId;
    return this.commentService.dislike(commentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/:postId')
  async deleteComment(
    @Param('id') commentId: string,
    @Param('postId') postId: string,
    @Request() req,
  ) {
    const userId = req.user.userId;
    return this.commentService.delete(commentId, postId, userId);
  }

  @Patch('update/:id')
  @UseInterceptors(FilesInterceptor('images', 2, multerConfig))
  async updatePost(
    @Param('id') commentId: string,
    @Body() data: UpdateCommentDto,
    @UploadedFiles() images?: Express.Multer.File[],
  ) {
    let result: { key: string; url: string }[] | null = null;
    if (images && images?.length > 0) {
      result = await this.mediaUploadService.uploadMultipleFiles(
        images,
        COMMENTS_IMAGE_FOLDER,
      );
    }
    return this.commentService.updateComment(commentId, data, result);
  }
}
