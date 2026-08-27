/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  CallHandler,
  ExecutionContext,
  HttpStatus,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { map, Observable, tap } from "rxjs";

export interface ApiResponse<T> {
  statusCode: number;
  success: boolean;
  content: T;
  message: string;
  timestamp: number;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  private readonly logger = new Logger(ResponseInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body, query, params } = req;
    const now = Date.now();

    this.logger.debug(`➡️ ${method} ${url} - Request received`);
    if (params && Object.keys(params).length) {
      this.logger.debug(`Params: ${JSON.stringify(params)}`);
    }
    if (query && Object.keys(query).length) {
      this.logger.debug(`Query: ${JSON.stringify(query)}`);
    }
    if (body && Object.keys(body).length) {
      this.logger.debug(`Body: ${JSON.stringify(body)}`);
    }

    return next.handle().pipe(
      map((data: T) => {
        return {
          statusCode: HttpStatus.OK,
          success: true,
          content: data,
          message: "Operation successful",
          timestamp: Date.now(),
        };
      }),
      tap((response: ApiResponse<T>) => {
        const res = context.switchToHttp().getResponse();
        const duration = Date.now() - now;

        this.logger.log(`⬅️ ${method} ${url} - Response sent (${res.statusCode}) in ${duration}ms`);
        this.logger.debug(`Response: ${JSON.stringify(response)}`);
      }),
    );
  }
}
