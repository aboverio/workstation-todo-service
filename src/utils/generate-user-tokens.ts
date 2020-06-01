import { sign as signJWT } from 'jsonwebtoken';

import { IUser } from '@/types';
import { User } from "@/models";

export default async function generateUserTokens(userData: IUser | any): Promise<any> {
  const JWT_ACCESS_SECRET: string | any = process.env.JWT_ACCESS_SECRET;
  const JWT_REFRESH_SECRET: string | any = process.env.JWT_REFRESH_SECRET;
  const err = new Error();
  err.name = "GenerateUserTokensError";

  try {
    const { firstName, lastName, username, email }: IUser = userData;
    const accessToken: string = await signJWT({ firstName, lastName, username, email }, JWT_ACCESS_SECRET, { expiresIn: "7d" });
    const refreshToken: string = await signJWT({ username }, JWT_REFRESH_SECRET, { expiresIn: "365d" });
    const foundUser: IUser | any = await User.findOne({ username: userData.username });
    const newRefreshTokens: Array<string> = foundUser.refreshTokens.concat(refreshToken);

    await User.updateOne({ username: userData.username }, { refreshTokens: newRefreshTokens });

    return Promise.resolve({
      accessToken,
      refreshToken
    });
  } catch (err) {
    return Promise.reject(err);
  }
}
