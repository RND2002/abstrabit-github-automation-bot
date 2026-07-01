export interface Rule {
  id: string;
  repoId: string;
  name: string;
  event: string;
  condition: string;
  action: string;
  actionArgs: string | null;
  slackWebhookUrl: string | null;
  slackAlert: boolean;
  slackMessage: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
