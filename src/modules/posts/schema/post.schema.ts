import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  generateSlugFromContent,
  PostImage,
  PostStatus,
} from '../dto/create-post.dto';
const { nanoid } = require('nanoid');
export type PostDocument = HydratedDocument<Post>;

@Schema({ timestamps: true }) // adds createdAt, updatedAt
export class Post {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop()
  section: string;

  @Prop()
  title: string;

  @Prop({ enum: PostStatus, default: PostStatus.PUBLISHED })
  status: PostStatus;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  likedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  bookmarkedBy: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  viewedBy: Types.ObjectId[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({
    type: [
      {
        secure_url: { type: String, required: true },
        public_id: { type: String, required: true },
      },
    ],
    default: [],
  })
  images: PostImage[];

  @Prop({ unique: true })
  slug: string;

  @Prop({ unique: true, index: true })
  slugId: string;

  @Prop({ default: false })
  commentsClosed: boolean;
}

export const PostSchema = SchemaFactory.createForClass(Post);

// Generate slug before saving
PostSchema.pre('save', async function (next) {
  if (!this.isNew) return next(); // Only create slug on new documents

  // const baseSlug = slugify(this.content.slice(0, 50), {
  //   lower: true,
  //   strict: true,
  // });
  const baseSlug = generateSlugFromContent(this.content);
  const shortId = nanoid(6);
  this.slug = baseSlug;
  this.slugId = shortId;
  next();
});
