import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { FeedsService } from './feeds.service';

@Controller('feed')
export class FeedsController {
  constructor(private readonly feedService: FeedsService) {}

  /**
   *  GET /feed               (default "after5" mode)
   *  GET /feed?mode=random   (random shuffle mode)
   *  GET /feed?mode=after5   (after every 5 posts)
   *  GET /feed?mode=pattern&pattern=3,8,12 (advanced custom positions)
   *
   *  Common query params:
   *    • section  – optional filter (e.g. "home")
   *    • page     – default 1
   *    • limit    – default 20
   */
  @Get()
  async unifiedFeed(
    @Query('mode') mode: 'random' | 'after5' | 'pattern' = 'after5',
    @Query('section') section?: string,
    @Query('pattern') pattern?: string, // only for mode=pattern
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.feedService.buildFeed({ mode, section, page, limit, pattern });
  }

  // Legacy endpoints kept for backward‑compatibility ----------------------- //
  @Get('random')
  random(
    @Query('section') s?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) p = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) l = 20,
  ) {
    return this.feedService.buildFeed({
      mode: 'random',
      section: s,
      page: p,
      limit: l,
    });
  }

  @Get('after5')
  after5(
    @Query('section') s?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) p = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) l = 20,
  ) {
    return this.feedService.buildFeed({
      mode: 'after5',
      section: s,
      page: p,
      limit: l,
    });
  }

  @Get('comments')
  async unifiedCommentFeed(
    @Query('mode') mode: 'random' | 'after5' | 'pattern' = 'after5',
    @Query('section') section?: string,
    @Query('pattern') pattern?: string, // only for mode=pattern
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.feedService.buildCommentFeed({
      mode,
      section,
      page,
      limit,
      pattern,
    });
  }

  /**
   *  GET /feed/random?section=home&page=1&limit=20
   *  ─────────────────────────────────────────────────────
   *  • Posts are paginated (page/limit)
   *  • Ads from the same section (status:ACTIVE) are randomly shuffled and
   *    inserted *approximately* every 5 posts (but positions are random).
   */
  @Get('random')
  getRandomInterleave(
    @Query('section') section?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.feedService.randomFeed({ section, page, limit });
  }

  @Get('after5')
  getFixedInterleave(
    @Query('section') section?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit = 20,
  ) {
    return this.feedService.afterFiveFeed({ section, page, limit });
  }
}
