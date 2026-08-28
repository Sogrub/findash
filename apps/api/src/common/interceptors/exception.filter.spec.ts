/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { HttpException, HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ExceptionsFilter } from "./exception.filter";
import { AppException } from "../exceptions/app.exception";

jest.mock("axios", () => ({
  isAxiosError: jest.fn().mockReturnValue(false),
}));

import { isAxiosError } from "axios";
const mockIsAxiosError = isAxiosError as unknown as jest.Mock;

function buildHost(url = "/test") {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status, json };
  const request = { url };
  return {
    host: {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(response),
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as any,
    status,
    json,
  };
}

describe("ExceptionsFilter", () => {
  let filter: ExceptionsFilter;

  beforeEach(() => {
    filter = new ExceptionsFilter();
    mockIsAxiosError.mockReturnValue(false);
  });

  // ── AppException ────────────────────────────────────────────────────────────

  describe("AppException", () => {
    it("handles AppException with string response", () => {
      const { host, status, json } = buildHost();
      const err = new AppException(HttpStatus.BAD_REQUEST, "bad input");

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "bad input" }),
      );
    });

    it("handles AppException with object response (code + content)", () => {
      const { host, status, json } = buildHost();
      const err = new AppException(HttpStatus.CONFLICT, "conflict msg", "ERR_CODE", { detail: "x" });

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "conflict msg", code: "ERR_CODE" }),
      );
    });
  });

  // ── HttpException ────────────────────────────────────────────────────────────

  describe("HttpException", () => {
    it("handles HttpException with string message", () => {
      const { host, status, json } = buildHost();
      const err = new HttpException("not found", HttpStatus.NOT_FOUND);

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: HttpStatus.NOT_FOUND }),
      );
    });

    it("handles HttpException with object message", () => {
      const { host, status, json } = buildHost();
      const err = new HttpException({ message: "validation failed" }, HttpStatus.UNPROCESSABLE_ENTITY);

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "validation failed" }),
      );
    });
  });

  // ── Prisma known errors ──────────────────────────────────────────────────────

  describe("Prisma.PrismaClientKnownRequestError", () => {
    const clientVersion = "5.22.0";

    it.each([
      ["P2002", HttpStatus.CONFLICT, "A record with this value already exists"],
      ["P2001", HttpStatus.NOT_FOUND, "Record not found"],
      ["P2025", HttpStatus.NOT_FOUND, "Record not found"],
      ["P2003", HttpStatus.BAD_REQUEST, "Related record not found"],
      ["P2000", HttpStatus.BAD_REQUEST, "The provided value is too long"],
    ])("maps code %s → status %d", (code, expectedStatus, expectedMessage) => {
      const { host, status, json } = buildHost();
      const err = new Prisma.PrismaClientKnownRequestError("db error", {
        code,
        clientVersion,
        meta: {},
      });

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(expectedStatus);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expectedMessage, code }),
      );
    });

    it("maps unknown Prisma code to 500", () => {
      const { host, status } = buildHost();
      const err = new Prisma.PrismaClientKnownRequestError("db error", {
        code: "P9999",
        clientVersion,
        meta: {},
      });

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    });
  });

  // ── Prisma validation error ──────────────────────────────────────────────────

  describe("Prisma.PrismaClientValidationError", () => {
    it("returns 400 with invalid data message", () => {
      const { host, status, json } = buildHost();
      const err = new Prisma.PrismaClientValidationError("validation failed", {
        clientVersion: "5.22.0",
      });

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Invalid data provided" }),
      );
    });
  });

  // ── Axios error ──────────────────────────────────────────────────────────────

  describe("Axios error", () => {
    it("uses response status when available", () => {
      const { host, status } = buildHost();
      const err = { message: "Network error", response: { status: 503, data: null } };
      mockIsAxiosError.mockReturnValue(true);

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(503);
    });

    it("falls back to 502 when no response status", () => {
      const { host, status } = buildHost();
      const err = { message: "Network error", response: undefined };
      mockIsAxiosError.mockReturnValue(true);

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    });

    it("includes axios error message in response", () => {
      const { host, json } = buildHost();
      const err = { message: "timeout", response: { status: 408, data: { info: "slow" } } };
      mockIsAxiosError.mockReturnValue(true);

      filter.catch(err, host);

      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "timeout" }),
      );
    });
  });

  // ── Object with code property ────────────────────────────────────────────────

  describe("error object with code property", () => {
    it("extracts statusCode from error object", () => {
      const { host, status } = buildHost();
      const err = { code: "CUSTOM_ERR", statusCode: 422, message: "custom error", content: null };

      filter.catch(err, host);

      expect(status).toHaveBeenCalledWith(422);
    });
  });

  // ── Unknown error ────────────────────────────────────────────────────────────

  describe("unknown error", () => {
    it("returns 500 for completely unknown error", () => {
      const { host, status, json } = buildHost();

      filter.catch("a plain string error", host);

      expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Internal server error" }),
      );
    });
  });

  // ── path included ────────────────────────────────────────────────────────────

  it("includes request url in the response body", () => {
    const { host, json } = buildHost("/api/accounts");
    filter.catch(new HttpException("err", 400), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/api/accounts" }),
    );
  });
});
