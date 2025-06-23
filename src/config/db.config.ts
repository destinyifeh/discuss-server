export const MONGO_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.MONGO_PROD_URL
    : process.env.MONGO_DEV_URL;
