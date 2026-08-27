/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { isAxiosError } from "axios";
import { Response, Request } from "express";
import { Prisma } from "@prisma/client";
import { AppException } from "../exceptions/app.exception";

@Catch()
export class ExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.getStatus(exception);
    const { message, content, code } =
      this.getPrismaErrorMessage(exception) ?? this.getErrorMessage(exception);

    this.logger.error(`❌ Exception caught: ${message} with code ${code} and status ${status}`);
    if (content)
      this.logger.debug(`🚀 ~ ExceptionsFilter ~ catch ~ content: ${JSON.stringify(content)}`);

    response.status(status).json({
      statusCode: status,
      content,
      message,
      code,
      path: request.url,
      timestamp: Date.now(),
    });
  }

  private getStatus(exception: unknown): number {
    if (exception instanceof AppException) return exception.getStatus();
    if (exception instanceof HttpException) return exception.getStatus();
    if (exception instanceof Prisma.PrismaClientKnownRequestError)
      return this.getPrismaStatus(exception.code);
    if (exception instanceof Prisma.PrismaClientValidationError) return HttpStatus.BAD_REQUEST;
    if (isAxiosError(exception)) return exception.response?.status ?? HttpStatus.BAD_GATEWAY;
    if (exception && typeof exception === "object" && "code" in exception)
      return (exception as any).statusCode as number;
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getPrismaStatus(code: string): number {
    const statusMap: Record<string, number> = {
      P2000: HttpStatus.BAD_REQUEST,
      P2001: HttpStatus.NOT_FOUND,
      P2002: HttpStatus.CONFLICT,
      P2003: HttpStatus.BAD_REQUEST,
      P2025: HttpStatus.NOT_FOUND,
    };
    return statusMap[code] ?? HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private getPrismaErrorMessage(
    exception: unknown,
  ): { message: string; content: unknown; code: string | null } | null {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const messages: Record<string, string> = {
        P2002: "A record with this value already exists",
        P2025: "Record not found",
        P2003: "Related record not found",
        P2001: "Record not found",
        P2000: "The provided value is too long",
      };
      return {
        message: messages[exception.code] ?? "Database error",
        content: null,
        code: exception.code,
      };
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return { message: "Invalid data provided", content: null, code: "P_VALIDATION" };
    }

    return null;
  }

  private getErrorMessage(exception: unknown): {
    message: string;
    content: unknown;
    code: string | null;
  } {
    if (exception instanceof AppException) {
      const res = exception.getResponse();
      if (typeof res === "string") return { message: res, content: null, code: null };
      if (typeof res === "object")
        return {
          message: (res as any).message ?? "Http Exception",
          content: (res as any).content ?? null,
          code: (res as any).code ?? null,
        };
    }

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === "string") return { message: res, content: null, code: null };
      if (typeof res === "object")
        return { message: (res as any).message ?? "Http Exception", content: res, code: null };
    }

    if (isAxiosError(exception)) {
      return {
        message: exception.message ?? "Axios request failed",
        content: exception.response?.data ?? null,
        code: null,
      };
    }

    if (exception && typeof exception === "object" && "code" in exception) {
      return {
        message: (exception as any).message,
        content: (exception as any).content,
        code: (exception as any).code,
      };
    }

    return { message: "Internal server error", content: null, code: null };
  }
}
