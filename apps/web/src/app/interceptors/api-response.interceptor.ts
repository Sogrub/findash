import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { map } from 'rxjs';

interface WrappedResponse<T> {
  content: T;
  success: boolean;
  statusCode: number;
}

export const apiResponseInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    map(event => {
      if (
        event instanceof HttpResponse &&
        event.body !== null &&
        typeof event.body === 'object' &&
        'content' in (event.body as object)
      ) {
        return event.clone({ body: (event.body as WrappedResponse<unknown>).content });
      }
      return event;
    }),
  );
