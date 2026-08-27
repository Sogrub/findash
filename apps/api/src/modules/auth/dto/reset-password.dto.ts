import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ResetPasswordDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @IsNotEmpty()
  code!: string;

  @ApiProperty({ example: "NewPass123!" })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
