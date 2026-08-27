import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy, Profile } from "passport-google-oauth20";
import { GoogleConfigEnvironment } from "@app/common/config/env/google.config";

export interface GoogleProfile {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, "google") {
  constructor(config: GoogleConfigEnvironment) {
    super({
      clientID: config.clientId,
      clientSecret: config.clientSecret,
      callbackURL: config.callbackUrl,
      scope: ["email", "profile"],
    });
  }

  validate(_accessToken: string, _refreshToken: string, profile: Profile): GoogleProfile {
    return {
      googleId: profile.id,
      email: profile.emails?.[0]?.value ?? "",
      fullName: profile.displayName,
      avatarUrl: profile.photos?.[0]?.value ?? "",
    };
  }
}
