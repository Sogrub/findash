import { IsString, IsNotEmpty, IsNumber, IsOptional, IsPositive, Max, Min } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateTransferDto {
  @ApiProperty({ example: "AC1234567890", description: "Número de cuenta destino" })
  @IsString()
  @IsNotEmpty()
  toAccountNumber!: string;

  @ApiProperty({ example: 500.0, description: "Monto a transferir (máx. 10 000 000)" })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  @Min(0.01)
  @Max(10_000_000)
  amount!: number;

  @ApiProperty({ example: "Pago arriendo", required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;
}
