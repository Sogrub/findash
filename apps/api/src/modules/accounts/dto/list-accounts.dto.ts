import { Type } from "class-transformer";
import { IsEnum, IsInt, IsIn, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export enum AccountSortField {
  FULL_NAME = "fullName",
  BALANCE = "balance",
  STATUS = "status",
  CREATED_AT = "createdAt",
}

export enum SortOrder {
  ASC = "asc",
  DESC = "desc",
}

export class ListAccountsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  @IsOptional()
  @IsEnum(AccountSortField)
  sortBy: AccountSortField = AccountSortField.CREATED_AT;

  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder: SortOrder = SortOrder.DESC;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsIn(["ACTIVE", "INACTIVE", "SUSPENDED"])
  status?: string;
}
