export class UserResponseDto {
  constructor(user: any) {
    this._id = user._id;
    this.username = user.username;
    this.email = user.email;
    this.avatar = user.avatar;
    this.cover_avatar = user.cover_avatar;
    this.bio = user.bio;
    this.roles = user.roles;
    this.gender = user.gender;
    this.dob = user.dob;
    this.age = user.age;
    this.phone = user.phone;
    this.website = user.website;
    this.location = user.location;
    this.joined = user.joined;
    this.totalFollowers = user.followers?.length || 0;
    this.totalFollowing = user.following?.length || 0;
  }

  _id: string;
  username: string;
  email: string;
  avatar: string;
  cover_avatar: string;
  bio: string;
  roles: string[];
  gender: string;
  dob: number;
  age: number;
  phone: string;
  website: string;
  location: string;
  joined: Date;
  totalFollowers: number;
  totalFollowing: number;
}
