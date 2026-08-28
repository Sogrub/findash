import { ValidationError } from "class-validator";
import { exceptionFactory, formatValidationErrors } from "./format-validation-errors.util";

function makeError(
  property: string,
  constraints?: Record<string, string>,
  children?: ValidationError[],
  target?: Record<string, string>,
): ValidationError {
  const err = new ValidationError();
  err.property = property;
  err.constraints = constraints;
  err.children = children;
  err.target = target;
  if (target) err.value = target[property];
  return err;
}

describe("formatValidationErrors", () => {
  it("formats a single error with constraints", () => {
    const err = makeError("email", { isEmail: "email must be an email" });
    const result = formatValidationErrors([err]);
    expect(result).toContain("email");
    expect(result).toContain("email must be an email");
  });

  it("joins multiple constraint messages with commas", () => {
    const err = makeError("password", {
      minLength: "too short",
      isStrongPassword: "too weak",
    });
    const result = formatValidationErrors([err]);
    expect(result).toContain("too short");
    expect(result).toContain("too weak");
  });

  it("recursively formats nested children", () => {
    const child = makeError("street", { isString: "must be a string" });
    const parent = makeError("address", undefined, [child]);
    const result = formatValidationErrors([parent]);
    expect(result).toContain("street");
    expect(result).toContain("must be a string");
  });

  it("falls back to JSON stringify for unknown error shape", () => {
    const err = makeError("unknown");
    // no constraints and no children — should JSON stringify
    const result = formatValidationErrors([err]);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("joins multiple errors with semicolons", () => {
    const e1 = makeError("email", { isEmail: "invalid email" });
    const e2 = makeError("name", { isNotEmpty: "must not be empty" });
    const result = formatValidationErrors([e1, e2]);
    expect(result).toContain(";");
  });
});

describe("exceptionFactory", () => {
  it("returns ValidationResponse array with error value and message", () => {
    const err = makeError("email", { isEmail: "invalid" }, undefined, { email: "bad-email" });
    const result = exceptionFactory([err]);

    expect(result).toHaveLength(1);
    expect(result[0].error).toBe("bad-email");
    expect(result[0].message).toContain("invalid");
  });

  it("returns undefined error when target is missing", () => {
    const err = makeError("name", { isNotEmpty: "required" });
    const result = exceptionFactory([err]);

    expect(result[0].error).toBeUndefined();
    expect(result[0].message).toContain("required");
  });

  it("returns undefined error when target value is not a string", () => {
    const err = makeError("age", { isNumber: "must be number" });
    err.target = { age: 42 } as any;
    const result = exceptionFactory([err]);

    expect(result[0].error).toBeUndefined();
  });

  it("handles empty validation array", () => {
    expect(exceptionFactory([])).toEqual([]);
  });

  it("handles multiple errors", () => {
    const e1 = makeError("email", { isEmail: "invalid" });
    const e2 = makeError("password", { minLength: "too short" });
    const result = exceptionFactory([e1, e2]);

    expect(result).toHaveLength(2);
  });
});
