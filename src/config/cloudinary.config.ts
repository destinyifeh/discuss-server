import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';

config();

const { UPLOAD_API_SECRET, UPLOAD_API_KEY, UPLOAD_CLOUD_NAME } = process.env;

cloudinary.config({
  cloud_name: UPLOAD_CLOUD_NAME,
  api_key: UPLOAD_API_KEY,
  api_secret: UPLOAD_API_SECRET,
});

export const cloudImageUploader = async (imagePath) => {
  try {
    const uploadResult = await cloudinary.uploader.upload(imagePath, {
      folder: 'deee',
    });

    return uploadResult;
  } catch (err) {
    console.log(err, 'upload err');
    throw err;
  }
};

export const cloudImageRemoval = async (photoIds, isMany = false) => {
  console.log({ isMany });
  try {
    const result = !isMany
      ? await cloudinary.uploader.destroy(photoIds, {
          invalidate: true,
        })
      : await cloudinary.api.delete_resources(photoIds);
    console.log('Image deleted:', result);
    return result;
  } catch (err) {
    console.log(err, 'delete err');
    throw err;
  }
};
