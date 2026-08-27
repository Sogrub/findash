import { registerAs } from "@nestjs/config";
import { IsNotEmpty, IsString } from "class-validator";
import { Expose, Type } from "class-transformer";
import { validateEnvironment } from "@app/common/utils/validate-env.util";

export class SwaggerEnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public readonly APP_TITLE!: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public readonly APP_DESCRIPTION!: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public readonly APP_VERSION!: string;
}

export interface ISwaggerEnvironment {
  readonly title: string;
  readonly description: string;
  readonly version: string;
}

export default registerAs("swagger", (): ISwaggerEnvironment => {
  const env = validateEnvironment<SwaggerEnvironmentVariables>(
    process.env,
    SwaggerEnvironmentVariables,
  );

  return {
    title: env.APP_TITLE,
    description: env.APP_DESCRIPTION,
    version: env.APP_VERSION,
  };
});
