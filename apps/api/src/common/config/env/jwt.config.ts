import { validateEnvironment } from "@app/common/utils/validate-env.util";
import { registerAs } from "@nestjs/config";
import { Expose, Type } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";

export class JwtConfigVariables {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public JWT_SECRET!: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public JWT_EXPIRES_IN!: string;
}

export interface JwtConfigEnvironment {
  readonly secret: string;
  readonly expiresIn: string;
}

export default registerAs("jwt", (): JwtConfigEnvironment => {
  const env = validateEnvironment<JwtConfigVariables>(process.env, JwtConfigVariables);
  return {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  };
});
