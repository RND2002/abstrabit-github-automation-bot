import React, { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchConnectedRepos, fetchAvailableRepos } from '../store/repoSlice';
import { connectRepo, disconnectRepo } from '../api/repo.api';
import { getGlobalEvents, retryEvent } from '../api/event.api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { toast } from 'sonner';
import { GitBranch, Plus, Trash2, ArrowRight, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { GithubRepo, Event } from '../types';
import { RepoCard } from '../components/RepoCard';

export const Dashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { connectedRepos, availableRepos, loading } = useAppSelector((state) => state.repo);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [disconnectData, setDisconnectData] = useState<{id: string, name: string} | null>(null);
  const [globalEvents, setGlobalEvents] = useState<Event[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getGlobalEvents();
      setGlobalEvents(data);
    } catch (e) {
      console.error('Failed to load global events', e);
    }
  }, []);

  useEffect(() => {
    dispatch(fetchConnectedRepos());
    fetchEvents();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchEvents();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [dispatch, fetchEvents]);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    dispatch(fetchAvailableRepos());
  };

  const handleConnect = async (repo: GithubRepo) => {
    setConnectingId(repo.id.toString());
    try {
      await connectRepo(repo.id.toString(), repo.owner.login, repo.name);
      toast.success(`Connected repository ${repo.full_name}`);
      dispatch(fetchConnectedRepos());
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to connect repository');
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!disconnectData) return;
    try {
      await disconnectRepo(disconnectData.id);
      toast.success(`Disconnected repository ${disconnectData.name}`);
      dispatch(fetchConnectedRepos());
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to disconnect repository');
    } finally {
      setDisconnectData(null);
    }
  };

  const handleRetry = async (eventId: string) => {
    try {
      await retryEvent(eventId);
      toast.success('Event retry initiated');
      fetchEvents();
    } catch (error) {
      toast.error('Failed to retry event');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-mono font-bold tracking-tight text-primary">Dashboard</h1>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Connect Repository
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto overflow-x-hidden">
            <DialogHeader>
              <DialogTitle className="font-mono text-xl">Connect Repository</DialogTitle>
              <DialogDescription className="font-sans">
                Select a GitHub repository to enable abstrabit automation.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-4">
              {loading && availableRepos.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground font-mono text-sm">Loading repositories...</div>
              ) : (
                availableRepos.map((repo) => {
                  const isConnected = connectedRepos.some((c) => c.githubRepoId === repo.id.toString());
                  return (
                    <RepoCard 
                      key={repo.id}
                      repo={repo}
                      isConnected={isConnected}
                      connectingId={connectingId}
                      onConnect={handleConnect}
                    />
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading && connectedRepos.length === 0 ? (
        <div className="text-muted-foreground font-mono text-sm">Loading connected repositories...</div>
      ) : connectedRepos.length === 0 ? (
        <Card className="border-dashed bg-background">
          <CardContent className="flex flex-col items-center justify-center h-64 text-center p-6">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-mono font-semibold mb-2">No repositories connected</h3>
            <p className="text-muted-foreground mb-4 max-w-sm font-sans">
              Connect your GitHub repositories to start setting up automation rules and webhooks.
            </p>
            <Button onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Connect Repository
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {connectedRepos.map((repo) => (
            <Card key={repo.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0 flex-1">
                    <CardTitle className="text-lg font-mono truncate text-primary" title={repo.name}>
                      {repo.name}
                    </CardTitle>
                    <CardDescription className="font-mono text-xs truncate">{repo.owner}</CardDescription>
                  </div>
                  <GitBranch className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                </div>
              </CardHeader>
              <CardFooter className="flex justify-between items-center mt-auto pt-4 border-t border-border">
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setDisconnectData({id: repo.id, name: repo.name})}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
                <Link to={`/repo/${repo.id}`}>
                  <Button variant="secondary" size="sm">
                    Configure
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Global Activity Feed */}
      {connectedRepos.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-mono font-bold tracking-tight text-primary mb-4">Recent Global Activity</h2>
          <Card>
            <CardContent className="p-4 sm:p-6">
              {globalEvents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No recent activity across your repositories.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {globalEvents.map((event) => (
                    <div key={event.id} className="flex flex-col p-4 border rounded-lg bg-card gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold">{(event as any).repo?.name}</span>
                            <span className="text-muted-foreground">/</span>
                            <span className="font-mono text-sm">{event.eventType}</span>
                            <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono border ${
                              event.status === 'PROCESSED' ? 'bg-secondary/10 text-secondary border-secondary' :
                              event.status === 'FAILED' ? 'bg-destructive/10 text-destructive border-destructive' :
                              event.status === 'IGNORED' ? 'bg-muted/50 text-muted-foreground border-border' :
                              'bg-primary/10 text-primary border-primary'
                            }`}>
                              {event.status}
                            </span>
                            {event.retryCount > 0 && (
                              <span className="px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono border bg-amber-500/10 text-amber-500 border-amber-500">
                                RETRIED {event.retryCount}x
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                            Delivery ID: {event.githubDeliveryId}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 mt-2 sm:mt-0">
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.createdAt).toLocaleString()}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleRetry(event.id)}>
                            <RefreshCcw className="h-3 w-3 mr-1" />
                            {event.status === 'FAILED' ? 'Retry' : 'Replay'}
                          </Button>
                        </div>
                      </div>

                      {event.errorLog && (
                        <div className="bg-destructive/5 p-3 rounded-md border border-destructive/20 text-destructive text-xs font-mono break-words">
                          <div className="font-semibold mb-1">Error Details:</div>
                          {event.errorLog}
                        </div>
                      )}

                      {event.aiSummary && (
                        <div className="bg-primary/5 p-3 rounded-md border border-primary/10">
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-semibold text-primary">🤖 AI Analysis</div>
                            <div className="flex space-x-2">
                              {event.aiPriority && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${event.aiPriority.toLowerCase().includes('high') ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                  Priority: {event.aiPriority}
                                </span>
                              )}
                              {event.aiSuggestedLabel && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-secondary/10 text-secondary">
                                  Label: {event.aiSuggestedLabel}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground font-sans">{event.aiSummary}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!disconnectData}
        title="Disconnect Repository"
        description={`Are you sure you want to disconnect ${disconnectData?.name}? Rules and events will be lost.`}
        confirmText="Disconnect"
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectData(null)}
      />
    </div>
  );
};
