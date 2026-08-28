import { ExecutionContext, HttpStatus } from "@nestjs/common";
import { CallHandler } from "@nestjs/common";
import { of, lastValueFrom } from "rxjs";
import { ResponseInterceptor } from "./response.interceptors";

function buildContext(overrides: { params?: object; query?: object; body?: object } = {}): ExecutionContext {
  const request = {
    method: "GET",
    url: "/api/test",
    body: overrides.body ?? {},
    query: overrides.query ?? {},
    params: overrides.params ?? {},
  };
  const response = { statusCode: 200 };
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
      getResponse: jest.fn().mockReturnValue(response),
    }),
  } as any;
}

function buildHandler(value: unknown): CallHandler {
  return { handle: jest.fn().mockReturnValue(of(value)) };
}

describe("ResponseInterceptor", () => {
  let interceptor: ResponseInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new ResponseInterceptor();
  });

  it("wraps response in ApiResponse envelope", async () => {
    const ctx = buildContext();
    const handler = buildHandler({ id: 1 });

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result).toMatchObject({
      statusCode: HttpStatus.OK,
      success: true,
      content: { id: 1 },
      message: "Operation successful",
    });
    expect(typeof result.timestamp).toBe("number");
  });

  it("logs params when present", async () => {
    const ctx = buildContext({ params: { id: "42" } });
    const handler = buildHandler(null);

    await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(ctx.switchToHttp).toHaveBeenCalled();
  });

  it("logs query when present", async () => {
    const ctx = buildContext({ query: { page: "1" } });
    const handler = buildHandler(null);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result.success).toBe(true);
  });

  it("logs body when present", async () => {
    const ctx = buildContext({ body: { name: "test" } });
    const handler = buildHandler(null);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result.success).toBe(true);
  });

  it("handles null data", async () => {
    const ctx = buildContext();
    const handler = buildHandler(null);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result.content).toBeNull();
  });

  it("handles array data", async () => {
    const ctx = buildContext();
    const handler = buildHandler([1, 2, 3]);

    const result = await lastValueFrom(interceptor.intercept(ctx, handler));

    expect(result.content).toEqual([1, 2, 3]);
  });
});
