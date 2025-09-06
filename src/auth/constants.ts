export const ACCESS_TOKEN_EXPIRATION_MS = 10 * 60 * 1000; // 15 minutes in milliseconds
export const REFRESH_TOKEN_EXPIRATION_MS2 = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const REFRESH_TOKEN_EXPIRATION_MS = 15 * 60 * 1000;

export const generateUrlTokenLink = (token: string) => {
  const link = `${process.env.APP_URL}/reset-password?token=${token}`;
  return link;
};
