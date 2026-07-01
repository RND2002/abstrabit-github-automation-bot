-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "aiPriority" TEXT,
ADD COLUMN     "aiSuggestedLabel" TEXT,
ADD COLUMN     "aiSummary" TEXT,
ADD COLUMN     "errorLog" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Repo" ADD COLUMN     "slackWebhookUrl" TEXT;

-- AlterTable
ALTER TABLE "Rule" ADD COLUMN     "slackAlert" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slackMessage" TEXT,
ADD COLUMN     "slackWebhookUrl" TEXT;
