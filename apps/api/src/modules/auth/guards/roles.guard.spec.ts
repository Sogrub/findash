import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { ROLES_KEY } from "../decorators/roles.decorator";

function buildContext(user: { role: string }): ExecutionContext {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  let reflector: jest.Mocked<Reflector>;
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it("allows access when no roles are required on the handler", () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const ctx = buildContext({ role: "CLIENT" });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("allows access when user has a required role", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    const ctx = buildContext({ role: "ADMIN" });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("throws ForbiddenException when user does not have any required role", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    const ctx = buildContext({ role: "CLIENT" });

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException with the correct message", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    const ctx = buildContext({ role: "CLIENT" });

    expect(() => guard.canActivate(ctx)).toThrow(
      "You do not have permission to access this resource",
    );
  });

  it("allows access when user has one of multiple required roles", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN", "SUPERUSER"]);
    const ctx = buildContext({ role: "ADMIN" });

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("uses ROLES_KEY with handler and class context", () => {
    reflector.getAllAndOverride.mockReturnValue(["ADMIN"]);
    const handler = jest.fn();
    const cls = jest.fn();
    const ctx = {
      getHandler: () => handler,
      getClass: () => cls,
      switchToHttp: () => ({ getRequest: () => ({ user: { role: "ADMIN" } }) }),
    } as unknown as ExecutionContext;

    guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [handler, cls]);
  });
});
