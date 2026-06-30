export interface Rule {
  id: string;
  repoId: string;
  name: string;
  event: string;
  condition: string;
  action: string;
  actionArgs: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
