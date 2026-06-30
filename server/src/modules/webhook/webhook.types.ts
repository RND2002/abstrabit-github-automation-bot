export interface GitHubWebhookPayload {
  action?: string;
  repository?: {
    id: number;
    full_name: string;
    owner: {
      login: string;
    };
    name: string;
  };
  sender?: {
    login: string;
  };
  [key: string]: any;
}
