import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { UploadApiResponse } from 'cloudinary';
import { Model, Types } from 'mongoose';
import { AdStatus } from 'src/common/utils/types/ad.types';
import { CreateAdDto, UpdateAdDto } from './dto/create-ad.dto';
import { Ad } from './schema/ad.schema';

@Injectable()
export class AdsService {
  constructor(@InjectModel(Ad.name) private readonly adModel: Model<Ad>) {}

  /* Create: author is the current user */
  async createAd(
    author: string,
    dto: CreateAdDto,
    image?: UploadApiResponse | null,
  ) {
    const ad = new this.adModel({
      ...dto,
      author: new Types.ObjectId(author),
      image: image?.secure_url ?? null,
      image_public_id: image?.public_id ?? null,
    });
    const savedAd = await ad.save();

    console.log('Saved ad:', savedAd);

    return {
      code: '200',
      message: 'success',
      data: savedAd,
    };
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
