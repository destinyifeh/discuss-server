import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AdStatus } from 'src/common/utils/types/ad.types';
import { CreateAdDto, UpdateAdDto } from './dto/create-ad.dto';
import { Ad } from './schema/ad.schema';

@Injectable()
export class AdsService {
  constructor(@InjectModel(Ad.name) private readonly adModel: Model<Ad>) {}

  /* Create: author is the current user */
  async create(author: any, dto: CreateAdDto) {
    const ad = new this.adModel({
      ...dto,
      authorId: author,
      //   authorName: author.name,
      //   authorUsername: author.username,
      //   authorAvatar: author.avatar,
      status: 'pending',
      submittedDate: new Date(),
    });
    return ad.save();
  }

  async findAll(section?: string) {
    const filter = section
      ? { section, status: 'active' }
      : { status: 'active' };
    return this.adModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string) {
    const ad = await this.adModel.findById(id);
    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  async update(id: string, dto: UpdateAdDto) {
    const ad = await this.adModel.findByIdAndUpdate(id, dto, {
      new: true,
      runValidators: true,
    });
    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  /* Admin-only helpers */
  async changeStatus(id: string, status: AdStatus) {
    const ad = await this.adModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!ad) throw new NotFoundException('Ad not found');
    return ad;
  }

  async remove(id: string) {
    const res = await this.adModel.deleteOne({ _id: id });
    if (res.deletedCount === 0) throw new NotFoundException('Ad not found');
    return { deleted: true };
  }
}
