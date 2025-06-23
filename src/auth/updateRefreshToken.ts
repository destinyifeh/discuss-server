import * as bcrypt from 'bcrypt';

export async function updateRefreshToken(userId: string, refreshToken: string) {
  const hashed = await bcrypt.hash(refreshToken, 10);
  return this.userModel.findByIdAndUpdate(userId, { refreshToken: hashed });
}
