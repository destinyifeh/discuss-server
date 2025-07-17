export const jwtConstants = {
  secret:
    'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
  refreshSecret: 'refresh_token_secret',
};

export const ACCESS_TOKEN = 'accessToken';
export const REFRESH_TOKEN = 'refreshToken';
export const ACCESS_TOKEN_EXPIRATION_MS = 5 * 60 * 1000; // 15 minutes in milliseconds
export const REFRESH_TOKEN_EXPIRATION_MS2 = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export const REFRESH_TOKEN_EXPIRATION_MS = 50 * 60 * 1000;

export const generateUrlTokenLink = (token: string) => {
  const link = `http://localhost:3001/reset-password?token=${token}`;
  return link;
};
