import React from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { GitBranch } from 'lucide-react';
import { GithubRepo } from '../types';

interface RepoCardProps {
  repo: GithubRepo;
  isConnected: boolean;
  connectingId: string | null;
  onConnect: (repo: GithubRepo) => void;
}

export const RepoCard: React.FC<RepoCardProps> = ({ repo, isConnected, connectingId, onConnect }) => {
  return (
    <Card className="flex flex-row items-center justify-between p-4 bg-background gap-3">
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <GitBranch className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
        <span className="font-mono text-sm truncate" title={repo.full_name}>{repo.full_name}</span>
      </div>
      <Button 
        size="sm" 
        variant={isConnected ? "outline" : "default"}
        disabled={isConnected || connectingId === repo.id.toString()}
        onClick={() => onConnect(repo)}
        className="font-mono uppercase text-xs tracking-wider flex-shrink-0"
      >
        {isConnected ? 'Connected' : (connectingId === repo.id.toString() ? 'Connecting...' : 'Connect')}
      </Button>
    </Card>
  );
};
