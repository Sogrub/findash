import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app/app.module";
import { INestApplication, Logger, ValidationPipe, VersioningType } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ValidationError } from "class-validator";
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger";
import { ISwaggerEnvironment } from "./common/config/env/swagger.config";
import { exceptionFactory } from "./common/utils/format-validation-errors.util";
import { ResponseInterceptor } from "./common/interceptors/response.interceptors";
import { ExceptionsFilter } from "./common/interceptors/exception.filter";
import { AppException } from "./common/exceptions/app.exception";
import { HttpStatusCode } from "axios";

function getEnvVariables(app: INestApplication): {
  port: number;
  apiVersion: string;
} {
  const configService: ConfigService = app.get(ConfigService);
  return {
    port: configService.get<number>("port", 3000),
    apiVersion: configService.get<string>("apiVersion", "1"),
  };
}

function configureApp(app: INestApplication, apiVersion: string): void {
  app.setGlobalPrefix("api");

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { groups: ["transform"] },
      exceptionFactory: (validationErrors: ValidationError[] = []): unknown => {
        const validation = exceptionFactory(validationErrors);
        throw new AppException(
          HttpStatusCode.BadRequest,
          validation.map((val) => val.message).join("\n"),
        );
      },
    }),
  );
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new ExceptionsFilter());
}

function buildDocument(app: INestApplication): Omit<OpenAPIObject, "paths"> {
  const configService = app.get(ConfigService);
  const swaggerConfig = configService.get<ISwaggerEnvironment>("swagger");
  if (!swaggerConfig) {
    throw new Error("Swagger configuration is missing or undefined.");
  }

  const { title, description, version } = swaggerConfig;

  return new DocumentBuilder()
    .setTitle(title)
    .setDescription(description)
    .setVersion(version)
    .addBearerAuth()
    .build();
}

function configureSwagger(app: INestApplication, port: number): void {
  const document: OpenAPIObject = SwaggerModule.createDocument(app, buildDocument(app));
  SwaggerModule.setup("docs", app, document);

  Logger.debug(`📕 Swagger docs is running on: http://localhost:${port}/docs`, "Swagger");
}

async function startServer(app: INestApplication, port: number): Promise<void> {
  await app.listen(port, () => Logger.debug(`🚀 Server listening on http://localhost:${port}/api`));
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ["error", "warn", "log", "debug", "verbose"],
  });
  const { port, apiVersion } = getEnvVariables(app);
  configureApp(app, apiVersion);
  configureSwagger(app, port);
  await startServer(app, port);
}

void bootstrap();
