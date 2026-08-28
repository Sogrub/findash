import { ExecutionContext } from "@nestjs/common";
import { CurrentUser } from "./current-user.decorator";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";

class TestController {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  endpoint(@CurrentUser() _user: unknown) {}
}

function getFactory(): (data: unknown, ctx: ExecutionContext) => unknown {
  const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, "endpoint") as Record<
    string,
    { factory: (data: unknown, ctx: ExecutionContext) => unknown }
  >;
  return args[Object.keys(args)[0]].factory;
}

function buildCtx(user: unknown): ExecutionContext {
  return {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("CurrentUser decorator", () => {
  it("returns request.user from the execution context", () => {
    const factory = getFactory();
    const mockUser = { id: "user-uuid", email: "test@example.com" };

    const result = factory(undefined, buildCtx(mockUser));

    expect(result).toBe(mockUser);
  });

  it("returns undefined when no user is attached to the request", () => {
    const factory = getFactory();

    const result = factory(undefined, buildCtx(undefined));

    expect(result).toBeUndefined();
  });
});
