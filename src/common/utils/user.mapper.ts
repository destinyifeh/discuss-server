import { UserDocument } from 'src/modules/users/schemas/user.schema';

export function toSafeUser(user: UserDocument) {
  return {
    _id: user._id.toString(),
    email: user.email,
    username: user.username,
    avatar: user.avatar,
    cover_avatar: user.cover_avatar,
    bio: user.bio,
    location: user.location,
    website: user.website,
    dob: user.dob,
    followers: user.followers,
    following: user.following,
    role: user.role,
    status: user.status,
    statusHistory: user.statusHistory,
    banReason: user.banReason,
    suspendedUntil: user.suspendedUntil,
    suspensionReason: user.suspensionReason,
    warnings: user.warnings,
    googleId: user.googleId,
    createdAt: user.createdAt.toISOString(),
    gender: user.gender,
  };
}

export const selectedFields = [
  'username',
  'email',
  'avatar',
  'bio',
  'roles',
  'followers',
  'following',
  'dob',
  'cover_avatar',
  'location',
  'website',
  'gender',
  '_id',
  'createdAt',
  'status',
  'banReason',
  'suspendedUntil',
  'suspensionReason',
  'warnings',
  'googleId',
  'statusHistory',
].join(' ');
