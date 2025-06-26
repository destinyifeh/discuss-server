import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AvatarValidationPipe } from 'src/common/utils/pipes/validatio.pipe';
import { multerConfig } from 'src/config/multer.config';
import { MediaUploadService } from '../media-upload/media-upload.service';

import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/create-comment.dto';

@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentService: CommentsService,
    private readonly mediaUploadService: MediaUploadService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('image', multerConfig))
  async createComment(
    @Body() data: CreateCommentDto,
    @UploadedFile(AvatarValidationPipe) file: Express.Multer.File,
    @Request() req,
  ) {
    const user = req.user.user;
    let image: { secure_url: string; public_id: string } | null = null;
    if (file) {
      const uploaded = await this.mediaUploadService.uploadImage(file);
      image = {
        secure_url: uploaded.secure_url,
        public_id: uploaded.public_id,
      };
    }

    return this.commentService.create(data, user, image);
  }

  @Get('post/:postId')
  async getComments(@Param('postId') postId: string) {
    return this.commentService.findByPost(postId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/like')
  async like(@Param('id') commentId: string, @Request() req) {
    const userId = req.user.userId;
    return this.commentService.like(commentId, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/dislike')
  async dislike(@Param('id') commentId: string, @Request() req) {
    const userId = req.user.userId;
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

  @Put(':id')
  @UseInterceptors(FileInterceptor('file'))
  async updateComment(
    @Param('id') id: string,
    @Body() data: UpdateCommentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.commentService.updateComment(id, data, file);
  }
}
