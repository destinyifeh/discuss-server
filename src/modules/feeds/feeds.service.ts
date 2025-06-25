import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Ad } from '../ads/schema/ad.schema';
import { Comment } from '../comments/schema/comment.schema';
import { Post } from '../posts/schema/post.schema';
import { FeedQuery } from './dto/feeds.dto';

@Injectable()
export class FeedsService {
  constructor(
    @InjectModel(Post.name) private readonly postModel: Model<Post>,
    @InjectModel(Ad.name) private readonly adModel: Model<Ad>,
    @InjectModel(Comment.name) private readonly commentModel: Model<Comment>,
  ) {}

  // --------------------- helpers ------------------------------------------- //
  private async fetchPosts({ section, page, limit }: FeedQuery) {
    const filter = section ? { section } : {};
    return this.postModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  private async fetchActiveAds(section?: string) {
    const filter: any = { status: 'active', type: 'Sponsored' };
    if (section) filter.section = section;
    return this.adModel.find(filter).lean();
  }

  private async fetchComments({ section, page, limit }: FeedQuery) {
    const filter = section ? { section } : {};
    return this.commentModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  }

  // --------------------- Unified buildFeed ---------------------------------- //
  async buildFeed(
    args: FeedQuery & {
      mode: 'random' | 'after5' | 'pattern';
      pattern?: string;
    },
  ) {
    const posts = await this.fetchPosts(args);
    const ads = await this.fetchActiveAds(args.section);

    switch (args.mode) {
      case 'random':
        return this.randomMerge(posts, ads);
      case 'pattern':
        return this.patternMerge(posts, ads, args.pattern);
      case 'after5':
      default:
        return this.afterFiveMerge(posts, ads);
    }
  }

  // --------------------- Unified buildFeed ---------------------------------- //
  async buildCommentFeed(
    args: FeedQuery & {
      mode: 'random' | 'after5' | 'pattern';
      pattern?: string;
    },
  ) {
    const posts = await this.fetchComments(args);
    const ads = await this.fetchActiveAds(args.section);

    switch (args.mode) {
      case 'random':
        return this.randomMerge(posts, ads);
      case 'pattern':
        return this.patternMerge(posts, ads, args.pattern);
      case 'after5':
      default:
        return this.afterFiveMerge(posts, ads);
    }
  }

  async randomFeed(args: FeedQuery) {
    const posts = await this.fetchPosts(args);
    const ads = await this.fetchActiveAds(args.section);
    return this.randomMerge(posts, ads);
  }

  async afterFiveFeed(args: FeedQuery) {
    const posts = await this.fetchPosts(args);
    const ads = await this.fetchActiveAds(args.section);
    return this.afterFiveMerge(posts, ads);
  }

  // --------------------- Strategy A: Random -------------------------------- //
  //   private randomMerge(posts: any[], ads: any[]) {
  //     // Shuffle ads (Fisher–Yates)
  //     for (let i = ads.length - 1; i > 0; i--) {
  //       const j = Math.floor(Math.random() * (i + 1));
  //       [ads[i], ads[j]] = [ads[j], ads[i]];
  //     }

  //     const out = [];
  //     let adPtr = 0;
  //     posts.forEach((p, idx) => {
  //       out.push({ _type: 'post', data: p });
  //       if ((idx + 1) % 5 === 0 && adPtr < ads.length) {
  //         out.push({ _type: 'ad', data: ads[adPtr++] });
  //       }
  //     });
  //     return out;
  //   }

  private randomMerge(posts: any[], ads: any[]) {
    // Shuffle ads (Fisher–Yates)
    for (let i = ads.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ads[i], ads[j]] = [ads[j], ads[i]];
    }

    // Explicitly type the merged output array so TypeScript knows what we push
    const out: { _type: 'post' | 'ad'; data: any }[] = [];
    let adPtr = 0;
    posts.forEach((p, idx) => {
      out.push({ _type: 'post', data: p });
      if ((idx + 1) % 5 === 0 && adPtr < ads.length) {
        out.push({ _type: 'ad', data: ads[adPtr++] });
      }
    });
    return out;
  }

  // --------------------- Strategy B: After every 5 posts ------------------- //
  private afterFiveMerge(posts: any[], ads: any[]) {
    const out: { _type: 'post' | 'ad'; data: any }[] = [];
    let adPtr = 0;
    posts.forEach((p, idx) => {
      out.push({ _type: 'post', data: p });
      if ((idx + 1) % 5 === 0 && adPtr < ads.length) {
        out.push({ _type: 'ad', data: ads[adPtr++] });
      }
    });
    return out;
  }

  // --------------------- Strategy C: Custom pattern ------------------------ //
  /** pattern string like "3,7,10" => insert ads at these absolute indices */
  private patternMerge(posts: any[], ads: any[], pattern?: string) {
    const positions = (pattern ?? '')
      .split(',')
      .map((n) => parseInt(n.trim()))
      .filter((n) => !isNaN(n));
    const out: any[] = [];
    let postIdx = 0;
    let adIdx = 0;

    const totalLength = posts.length + Math.min(ads.length, positions.length);
    for (let i = 0; i < totalLength; i++) {
      if (positions.includes(i) && adIdx < ads.length) {
        out.push({ _type: 'ad', data: ads[adIdx++] });
      } else if (postIdx < posts.length) {
        out.push({ _type: 'post', data: posts[postIdx++] });
      }
    }
    return out;
  }
}
