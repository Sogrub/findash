import { HttpException } from "@nestjs/common";

export class AppException extends HttpException {
  public constructor(
    status: number,
    message: string,
    code: string | null = null,
    content: unknown = null,
  ) {
    super(
      {
        statusCode: status,
        message,
        code,
        content,
        timestamp: Date.now(),
      },
      status,
    );
  }
}
