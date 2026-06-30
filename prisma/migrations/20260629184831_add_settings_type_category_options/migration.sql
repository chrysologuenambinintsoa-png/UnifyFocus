-- AlterTable
ALTER TABLE "AppSetting" ADD COLUMN "category" TEXT DEFAULT 'General';
ALTER TABLE "AppSetting" ADD COLUMN "options" TEXT;
ALTER TABLE "AppSetting" ADD COLUMN "type" TEXT DEFAULT 'text';
