export interface Repo {
  id: string;
  githubRepoId: string;
  owner: string;
  name: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConnectRepoInput {
  githubRepoId: string;
  owner: string;
  name: string;
}
