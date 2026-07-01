import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { getRulesByRepo, createRule, deleteRule } from '../api/rule.api';
import { updateRepoSettings } from '../api/repo.api';
import { getEventsByRepo, retryEvent } from '../api/event.api';
import { Rule, Event } from '../types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { ArrowLeft, Trash2, Activity, GitCommit, GitBranch, Webhook, Plus, RefreshCcw } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/confirm-dialog';
import { RuleBuilder, RuleFormValues } from '../components/RuleBuilder';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { fetchConnectedRepos } from '../store/repoSlice';

export const RepoDetails: React.FC = () => {
  const { repoId } = useParams<{ repoId: string }>();
  const { connectedRepos, loading: isRepoLoading } = useAppSelector((state) => state.repo);
  
  const [rules, setRules] = useState<Rule[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);
  const [repoSlackUrl, setRepoSlackUrl] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const dispatch = useAppDispatch();

  const repo = connectedRepos.find((r) => r.id === repoId);

  useEffect(() => {
    if (connectedRepos.length === 0) {
      dispatch(fetchConnectedRepos());
    }
  }, [connectedRepos.length, dispatch]);

  useEffect(() => {
    if (repo?.slackWebhookUrl) {
      setRepoSlackUrl(repo.slackWebhookUrl);
    }
  }, [repo?.slackWebhookUrl]);

  const fetchData = useCallback(async () => {
    if (!repoId) return;
    try {
      const [rulesData, eventsData] = await Promise.all([
        getRulesByRepo(repoId),
        getEventsByRepo(repoId)
      ]);
      setRules(rulesData);
      setEvents(eventsData);
    } catch (error) {
      toast.error('Failed to load repository details');
    } finally {
      setLoading(false);
    }
  }, [repoId]);

  useEffect(() => {
    fetchData();
    // In a real app we'd use WebSockets. For now, simple polling for "live log".
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, 10000);
    return () => clearInterval(intervalId);
  }, [fetchData]);

  const handleRetry = async (eventId: string) => {
    try {
      await retryEvent(eventId);
      toast.success('Event retry initiated');
      fetchData();
    } catch (error) {
      toast.error('Failed to retry event');
    }
  };

  const onSubmit = async (data: RuleFormValues) => {
    if (!repoId) return;
    try {
      await createRule({ ...data, repoId });
      toast.success('Rule created successfully');
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create rule');
    }
  };

  const handleDeleteRule = async () => {
    if (!deleteRuleId) return;
    try {
      await deleteRule(deleteRuleId);
      toast.success('Rule deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete rule');
    } finally {
      setDeleteRuleId(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!repoId) return;
    setIsSavingSettings(true);
    try {
      await updateRepoSettings(repoId, { slackWebhookUrl: repoSlackUrl });
      toast.success('Repository settings saved');
      dispatch(fetchConnectedRepos());
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isRepoLoading || loading) {
    return <div className="text-center mt-20 text-muted-foreground">Loading repository details...</div>;
  }

  if (!repoId || !repo) {
    return <div className="text-center mt-20 text-muted-foreground">Repository not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link to="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-primary">{repo?.name || 'Loading...'}</h1>
          <p className="text-muted-foreground font-mono text-sm">{repo?.owner}</p>
        </div>
      </div>

      <Tabs defaultValue="rules" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="rules" className="text-xs sm:text-sm">Rules</TabsTrigger>
          <TabsTrigger value="events" className="text-xs sm:text-sm">Event Log</TabsTrigger>
          <TabsTrigger value="settings" className="text-xs sm:text-sm">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="rules" className="mt-6 space-y-6">
          <RuleBuilder repoId={repoId!} repoSlackUrl={repo?.slackWebhookUrl} recentEvents={events} existingRules={rules} onSubmit={onSubmit} />

          <div className="space-y-4">
            <h3 className="text-xl font-mono font-semibold">Existing Rules</h3>
            {rules.length === 0 ? (
              <p className="text-muted-foreground font-sans">No rules configured yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {rules.map((rule) => (
                  <Card key={rule.id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-mono flex justify-between text-primary">
                        {rule.name}
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteRuleId(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                      <CardDescription className="font-mono text-xs">Event: {rule.event}</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 font-sans">
                      <div className="font-mono text-xs"><span className="text-muted-foreground">Condition:</span> {rule.condition}</div>
                      <div className="font-mono text-xs"><span className="text-muted-foreground">Action:</span> {rule.action}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5 text-primary" />
                Live Event Log
              </CardTitle>
              <CardDescription>Recent webhooks received from GitHub and actions processed.</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GitCommit className="mx-auto h-12 w-12 opacity-20 mb-3" />
                  <p>No events received yet.</p>
                  <p className="text-sm">Trigger an event on GitHub to see it appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {events.map((event) => (
                    <div key={event.id} className="flex flex-col p-4 border rounded-lg bg-card gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-semibold">{event.eventType}</span>
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
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Repository Settings</CardTitle>
              <CardDescription>Configure default behaviors for this repository.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="repoSlackUrl">Default Slack Webhook URL</Label>
                <Input
                  id="repoSlackUrl"
                  placeholder="https://hooks.slack.com/services/..."
                  value={repoSlackUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRepoSlackUrl(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  This URL will be used as the default destination for all Slack Message actions in this repository.
                </p>
              </div>
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                {isSavingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDialog 
        isOpen={!!deleteRuleId}
        title="Delete Rule"
        description="Are you sure you want to delete this automation rule? This action cannot be undone."
        confirmText="Delete"
        onConfirm={handleDeleteRule}
        onCancel={() => setDeleteRuleId(null)}
      />
    </div>
  );
};
