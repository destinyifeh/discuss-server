export const jwtConstants = {
  secret:
    'DO NOT USE THIS VALUE. INSTEAD, CREATE A COMPLEX SECRET AND KEEP IT SAFE OUTSIDE OF THE SOURCE CODE.',
  refreshSecret: 'refresh_token_secret',
};

export const generateUrlTokenLink = (token: string) => {
  const link = `http://localhost:3001/reset-password?token=${token}`;
  return link;
};
