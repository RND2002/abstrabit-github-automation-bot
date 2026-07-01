export interface User {
  id: string;
  githubId: string;
  email: string | null;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Repo {
  id: string;
  githubRepoId: string;
  owner: string;
  name: string;
  userId: string;
  slackWebhookUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GithubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  html_url?: string;
  description?: string;
  private?: boolean;
}

export interface Rule {
  id: string;
  repoId: string;
  name: string;
  event: string;
  condition: string;
  action: string;
  actionArgs?: string;
  slackWebhookUrl?: string | null;
  slackAlert?: boolean;
  slackMessage?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  repoId: string;
  githubDeliveryId: string;
  eventType: string;
  payload: string;
  status: 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  aiSummary?: string | null;
  aiPriority?: string | null;
  aiSuggestedLabel?: string | null;
  errorLog?: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}
