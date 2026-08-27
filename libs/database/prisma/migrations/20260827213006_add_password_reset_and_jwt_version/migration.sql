-- AlterTable
ALTER TABLE "users" ADD COLUMN     "jwt_version" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "password_reset_expiry" TIMESTAMP(3),
ADD COLUMN     "password_reset_token" TEXT;
