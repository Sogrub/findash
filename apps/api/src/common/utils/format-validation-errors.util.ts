import { ValidationError } from "class-validator";

export interface ValidationResponse {
  error: string | undefined;
  message?: string;
}

export const exceptionFactory = (validationErrors: ValidationError[]): ValidationResponse[] => {
  return validationErrors.map((error): ValidationResponse => {
    const args =
      error.target && typeof error.target === "object"
        ? (error.target as Record<string, string>)
        : undefined;

    const errValue =
      args && typeof args[error.property] === "string" ? args[error.property] : undefined;

    return {
      error: errValue,
      message: formatValidationErrors([error]),
    };
  });
};

export function formatValidationErrors(validationErrors: ValidationError[]): string {
  const formatterErrors = validationErrors.map((error) => {
    const { property, constraints } = error;
    if (property && constraints) {
      const message = Object.values(constraints);
      return `Property ${property} has the following errors: ${message.join(", ")}`;
    }
    if (error.children) {
      return formatValidationErrors(error.children);
    }
    return JSON.stringify(error);
  });

  return formatterErrors.join("; ");
}
