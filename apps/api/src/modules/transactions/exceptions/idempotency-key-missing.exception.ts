import { BadRequestException } from "@nestjs/common";

export class IdempotencyKeyMissingException extends BadRequestException {
  constructor() {
    super("La cabecera X-Idempotency-Key es obligatoria");
  }
}
