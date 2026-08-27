import { ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { Environment } from "../enums/node-env.enum";
import { Logger } from "@nestjs/common";

export function validateEnvironment<T extends object>(
  config: Record<string, unknown>,
  cls: ClassConstructor<T>,
): T {
  const validatedConfig: T = plainToInstance(cls, config, {
    excludeExtraneousValues: true,
  });
  const errors = validateSync(validatedConfig);
  if (errors.length > 0) throw new Error(errors.toString());
  if ((process.env["NODE_ENV"] as Environment) !== Environment.PRODUCTION) {
    const logger = new Logger();
    Object.entries(config).forEach(([key, value]) => {
      if (!validatedConfig[key]) return;
      if (`${validatedConfig[key]}` !== `${String(value)}`) {
        logger.warn(
          `Environment variable ${key} was not defined, using default value: ${validatedConfig[key]}`,
          cls.name,
        );
      }
      logger.log(`Loading env variable ${key} with value: ${String(value)}`, cls.name);
    });
  }
  return validatedConfig;
}
