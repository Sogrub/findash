import { validateEnvironment } from "@app/common/utils/validate-env.util";
import { registerAs } from "@nestjs/config";
import { Expose, Type } from "class-transformer";
import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class NodeConfigVariables {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public NODE_ENV!: string;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Expose()
  public PORT!: number;

  @IsNumber()
  @IsNotEmpty()
  @Type(() => Number)
  @Expose()
  public REQUEST_TIMEOUT!: number;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public APP_NAME!: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public API_VERSION!: string;

  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @Expose()
  public FRONTEND_URL!: string;
}

export interface NodeConfigEnvironment {
  readonly nodeEnv: string;
  readonly port: number;
  readonly requestTimeout: number;
  readonly appName: string;
  readonly apiVersion: string;
  readonly frontendUrl: string;
}

export default registerAs("node", (): NodeConfigEnvironment => {
  const env = validateEnvironment<NodeConfigVariables>(process.env, NodeConfigVariables);
  return {
    nodeEnv: env.NODE_ENV,
    port: env.PORT,
    requestTimeout: env.REQUEST_TIMEOUT,
    appName: env.APP_NAME,
    apiVersion: env.API_VERSION,
    frontendUrl: env.FRONTEND_URL,
  };
});
