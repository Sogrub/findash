import { validateEnvironment } from "@app/common/utils/validate-env.util";
import { registerAs } from "@nestjs/config";
import { Expose, Type } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class GoogleConfigVariables {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public GOOGLE_CLIENT_ID!: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public GOOGLE_CLIENT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public GOOGLE_CALLBACK_URL!: string;
}

export interface GoogleConfigEnvironment {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly callbackUrl: string;
}

export default registerAs("google", (): GoogleConfigEnvironment => {
  const env = validateEnvironment<GoogleConfigVariables>(process.env, GoogleConfigVariables);
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    callbackUrl: env.GOOGLE_CALLBACK_URL,
  };
});
