import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Event, Rule } from '../types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import api from '../api/client';
import { EVENT_ACTIONS_MAP, TEMPLATE_VARIABLES } from '../constants/rule-constants';

const ruleSchema = z.object({
  name: z.string().min(1, { message: "Rule name is required" }),
  event: z.string().min(1, { message: "Event type is required" }),
  condition: z.string().min(1, { message: "Condition is required (e.g. true)" }),
  action: z.string().min(1, { message: "Action is required" }),
  actionArgs: z.string().optional(),
});

export type RuleFormValues = z.infer<typeof ruleSchema>;

interface RuleBuilderProps {
  repoId: string;
  repoSlackUrl?: string | null;
  recentEvents: Event[];
  existingRules?: Rule[];
  onSubmit: (data: RuleFormValues & { slackWebhookUrl?: string | null }) => Promise<void>;
}

export const RuleBuilder: React.FC<RuleBuilderProps> = ({ repoSlackUrl, recentEvents, existingRules, onSubmit }) => {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [slackMessage, setSlackMessage] = useState('A new event happened: {{issue.title}}');
  const [sendSlackAlert, setSendSlackAlert] = useState(false);
  const [isVerifyingSlack, setIsVerifyingSlack] = useState(false);
  const [validationResult, setValidationResult] = useState<{ status: 'match' | 'no-match' | 'error' | 'none', message: string }>({ status: 'none', message: '' });
  
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      name: '',
      event: 'issues',
      condition: 'payload.action === "opened"',
      action: 'SLACK_MESSAGE',
      actionArgs: '{\n  "message": "A new issue was opened! {{issue.title}}"\n}',
    },
  });

  const watchEvent = form.watch("event");
  const watchCondition = form.watch("condition");
  const watchAction = form.watch("action");
  const watchActionArgs = form.watch("actionArgs");

  const sampleEvent = recentEvents.find(e => e.eventType === watchEvent) || recentEvents[0];
  const samplePayloadJson = sampleEvent ? sampleEvent.payload : null;

  useEffect(() => {
    if (!repoSlackUrl && existingRules && existingRules.length > 0 && !slackWebhookUrl) {
      const slackRule = existingRules.find(r => r.action === 'SLACK_MESSAGE' && r.slackWebhookUrl);
      if (slackRule?.slackWebhookUrl) {
        setSlackWebhookUrl(slackRule.slackWebhookUrl);
      }
    }
  }, [existingRules, slackWebhookUrl, repoSlackUrl]);

  useEffect(() => {
    if (!isAdvancedMode && EVENT_ACTIONS_MAP[watchEvent]) {
      form.setValue("condition", EVENT_ACTIONS_MAP[watchEvent][0].value);
    } else if (!isAdvancedMode) {
       form.setValue("condition", 'true');
    }
  }, [watchEvent, isAdvancedMode, form]);

  useEffect(() => {
    if (!samplePayloadJson || !watchCondition) {
      setValidationResult({ status: 'none', message: '' });
      return;
    }

    try {
      let payloadObj = {};
      try {
        payloadObj = JSON.parse(samplePayloadJson);
      } catch (e) {
        // If string payload parsing fails, use empty obj
      }
      
      const func = new Function('payload', `return ${watchCondition}`);
      const result = func(payloadObj);
      
      if (result) {
        setValidationResult({ status: 'match', message: '✓ Condition matches the sample payload' });
      } else {
        setValidationResult({ status: 'no-match', message: '✗ Condition does not match the sample payload' });
      }
    } catch (e: any) {
      setValidationResult({ status: 'error', message: `⚠️ Evaluation error: ${e.message}` });
    }
  }, [watchCondition, samplePayloadJson]);

  // Static mismatch warnings
  const mismatchWarning = (() => {
    if (watchEvent === 'push' && watchCondition.includes('payload.action')) {
      return "The 'push' event does not typically contain a payload.action field.";
    }
    return null;
  })();

  const handleSubmitWrapper = async (data: RuleFormValues) => {
    let finalData: any = { ...data };
    
    // Validate slack config if it's the primary action or if the secondary alert is toggled
    const isSlackPrimary = data.action === 'SLACK_MESSAGE';
    if (isSlackPrimary || sendSlackAlert) {
      if (!repoSlackUrl && !slackWebhookUrl) {
        toast.error("No default Slack Webhook URL is set for this repository. Please provide one in the override or configure it in Repository Settings.");
        return;
      }
      if (!slackMessage) {
        toast.error("Slack Message is required");
        return;
      }
    }

    if (isSlackPrimary) {
      finalData.actionArgs = JSON.stringify({
        message: slackMessage
      });
      finalData.slackWebhookUrl = slackWebhookUrl || null;
      finalData.slackAlert = false; // Primary handles it
      finalData.slackMessage = null;
    } else {
      if (sendSlackAlert) {
        finalData.slackAlert = true;
        finalData.slackMessage = slackMessage;
        finalData.slackWebhookUrl = slackWebhookUrl || null;
      } else {
        finalData.slackAlert = false;
        finalData.slackMessage = null;
      }
    }
    
    await onSubmit(finalData);
    form.reset();
    setSlackWebhookUrl('');
    setSendSlackAlert(false);
    setSlackMessage('A new event happened: {{issue.title}}');
  };

  const handleVerifySlack = async () => {
    if (!slackWebhookUrl) {
      toast.error("Please enter a webhook URL first");
      return;
    }
    
    try {
      setIsVerifyingSlack(true);
      await api.post('/rule/slack/verify', { webhookUrl: slackWebhookUrl });
      toast.success("Webhook verified successfully! Ping sent to Slack.");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to verify webhook URL");
    } finally {
      setIsVerifyingSlack(false);
    }
  };

  const insertVariable = (variable: string) => {
    const currentArgs = form.getValues("actionArgs") || "";
    
    // Try to insert the variable inside the last string value of the JSON
    // Matches the last quote right before the closing brace(s)
    if (currentArgs.match(/(")(?=\s*})/)) {
      const updatedArgs = currentArgs.replace(/(")(?=\s*})/, `${variable}$1`);
      form.setValue("actionArgs", updatedArgs, { shouldValidate: true });
    } else {
      form.setValue("actionArgs", currentArgs + variable, { shouldValidate: true });
    }
  };

  const currentEventOptions = EVENT_ACTIONS_MAP[watchEvent] || EVENT_ACTIONS_MAP['*'];

  const getDummyPreview = (argsStr: string) => {
    if (!argsStr) return "No arguments provided.";
    let preview = argsStr
      .replace(/{{issue\.title}}/g, "Fix login bug")
      .replace(/{{issue\.number}}/g, "42")
      .replace(/{{pull_request\.title}}/g, "Update dependencies")
      .replace(/{{pull_request\.number}}/g, "43")
      .replace(/{{repository\.name}}/g, "abstrabit-demo")
      .replace(/{{sender\.login}}/g, "octocat");
      
    try {
      const obj = JSON.parse(preview);
      if (obj.message) return obj.message;
      if (obj.body) return obj.body;
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return "⚠️ Invalid JSON formatting - Fix to see preview";
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Create New Rule</CardTitle>
            <CardDescription>Configure a new automation for this repository.</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsAdvancedMode(!isAdvancedMode)}
            className="font-mono text-xs uppercase tracking-wide"
          >
            {isAdvancedMode ? 'Switch to Simple Mode' : 'Switch to Advanced Mode'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(handleSubmitWrapper)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input id="name" placeholder="e.g. Notify on Issue" {...form.register('name')} />
              {form.formState.errors.name && <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event">GitHub Event</Label>
              <select 
                id="event" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans" 
                {...form.register('event')}
              >
                <option value="issues">Issues</option>
                <option value="pull_request">Pull Request</option>
                <option value="push">Push</option>
                <option value="*">All Events</option>
              </select>
              {form.formState.errors.event && <p className="text-sm text-destructive">{form.formState.errors.event.message}</p>}
            </div>

            <div className="space-y-2 col-span-2">
              {isAdvancedMode ? (
                <>
                  <Label htmlFor="condition" className="flex items-center justify-between">
                    <span>Condition (JS Expression) - Advanced Mode</span>
                    <span className={`text-xs font-mono font-medium px-2 py-0.5 border ${
                      validationResult.status === 'match' ? 'bg-secondary/10 text-secondary border-secondary' :
                      validationResult.status === 'error' ? 'bg-destructive/10 text-destructive border-destructive' :
                      validationResult.status === 'no-match' ? 'bg-muted/50 text-muted-foreground border-muted' :
                      'hidden'
                    }`}>
                      {validationResult.message}
                    </span>
                  </Label>
                  <Input id="condition" placeholder="e.g. payload.action === 'opened'" {...form.register('condition')} className="font-mono" />
                  
                  <div className="flex flex-wrap gap-1 mt-2">
                    <span className="text-[10px] text-muted-foreground self-center mr-1">Quick snippets:</span>
                    {currentEventOptions.map((opt, i) => (
                      <button 
                        key={i} 
                        type="button" 
                        onClick={() => form.setValue('condition', opt.value, { shouldValidate: true })}
                        className="px-2 py-0.5 text-[10px] bg-muted/50 border border-border rounded font-mono hover:bg-muted/80 text-muted-foreground transition-colors"
                        title={opt.description}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  
                  {mismatchWarning && (
                    <p className="text-sm text-destructive font-mono mt-1">⚠️ {mismatchWarning}</p>
                  )}
                  {form.formState.errors.condition && <p className="text-sm text-destructive">{form.formState.errors.condition.message}</p>}

                  {samplePayloadJson && (
                    <div className="mt-2 text-xs">
                      <details>
                        <summary className="cursor-pointer font-mono text-muted-foreground hover:text-foreground">View Sample Payload (from recent event)</summary>
                        <pre className="mt-2 p-4 bg-muted/50 rounded-md overflow-auto max-h-[300px] text-[10px] font-mono border border-border">
                          {JSON.stringify(JSON.parse(samplePayloadJson), null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Label htmlFor="condition">When action is...</Label>
                  <select 
                    id="condition_dropdown"
                    value={watchCondition}
                    onChange={(e) => form.setValue("condition", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans" 
                  >
                    {currentEventOptions.map((opt, i) => (
                      <option key={i} value={opt.value}>
                        {opt.label} - {opt.description}
                      </option>
                    ))}
                  </select>
                  {mismatchWarning && (
                    <p className="text-sm text-destructive font-mono mt-1">⚠️ {mismatchWarning}</p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="action">Action</Label>
              <select 
                id="action" 
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-sans" 
                {...form.register('action')}
              >
                <option value="SLACK_MESSAGE">Slack Message</option>
                <option value="GITHUB_COMMENT">GitHub Comment</option>
                <option value="GITHUB_ADD_LABEL">GitHub Add Label</option>
              </select>
              {form.formState.errors.action && <p className="text-sm text-destructive">{form.formState.errors.action.message}</p>}
            </div>

            {watchAction !== 'SLACK_MESSAGE' && (
              <div className="space-y-2 col-span-2">
                <Label htmlFor="actionArgs" className="block mb-1">Action Arguments (JSON)</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {TEMPLATE_VARIABLES.map(variable => (
                    <button 
                      key={variable} 
                      type="button" 
                      onClick={() => insertVariable(variable)}
                      className="px-2 py-0.5 text-[10px] bg-muted/50 border border-border rounded font-mono hover:bg-muted/80 text-muted-foreground transition-colors"
                    >
                      {variable}
                    </button>
                  ))}
                </div>
                <textarea 
                  id="actionArgs" 
                  rows={4}
                  placeholder='{\n  "message": "Hello!"\n}' 
                  {...form.register('actionArgs')} 
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono" 
                />
                {form.formState.errors.actionArgs && <p className="text-sm text-destructive">{form.formState.errors.actionArgs.message}</p>}
              </div>
            )}

            {watchAction === 'SLACK_MESSAGE' || sendSlackAlert ? (
              <div className="space-y-4 col-span-2 p-4 border border-border bg-muted/20 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-mono font-semibold text-sm">Slack Configuration {sendSlackAlert && watchAction !== 'SLACK_MESSAGE' && "(Secondary Action)"}</h4>
                  {watchAction !== 'SLACK_MESSAGE' && (
                    <Button variant="ghost" size="sm" onClick={() => setSendSlackAlert(false)} className="h-6 text-xs font-mono">Remove</Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slackMessage">Message Template</Label>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {TEMPLATE_VARIABLES.map(variable => (
                      <button 
                        key={variable} 
                        type="button" 
                        onClick={() => setSlackMessage(prev => prev + variable)}
                        className="px-2 py-0.5 text-[10px] bg-muted/50 border border-border rounded font-mono hover:bg-muted/80 text-muted-foreground transition-colors"
                      >
                        {variable}
                      </button>
                    ))}
                  </div>
                  <textarea 
                    id="slackMessage" 
                    rows={2}
                    value={slackMessage}
                    onChange={(e: any) => setSlackMessage(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 font-mono" 
                  />
                </div>
                <details className="mt-4 pt-4 border-t border-border">
                  <summary className="cursor-pointer font-mono text-xs text-muted-foreground hover:text-foreground">
                    Advanced: Override Slack Webhook URL
                  </summary>
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="slackWebhookUrl">Slack Webhook URL Override</Label>
                    <div className="flex gap-2">
                      <Input 
                        id="slackWebhookUrl" 
                        placeholder={repoSlackUrl ? "Leave blank to use Repo Default" : "https://hooks.slack.com/services/..."} 
                        value={slackWebhookUrl}
                        onChange={(e: any) => setSlackWebhookUrl(e.target.value)}
                        className="font-mono text-xs" 
                      />
                      <Button 
                        type="button" 
                        variant="secondary"
                        onClick={handleVerifySlack}
                        disabled={isVerifyingSlack || !slackWebhookUrl}
                      >
                        {isVerifyingSlack ? "Verifying..." : "Verify"}
                      </Button>
                    </div>
                    {repoSlackUrl && !slackWebhookUrl && (
                      <p className="text-xs text-muted-foreground">Using repository default Slack URL.</p>
                    )}
                  </div>
                </details>
              </div>
            ) : null}
            
            {watchAction !== 'SLACK_MESSAGE' && !sendSlackAlert && (
              <div className="col-span-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setSendSlackAlert(true)}
                  className="font-mono text-xs w-full border-dashed"
                >
                  + Add Secondary Action: Send Slack Alert
                </Button>
              </div>
            )}
            
            <div className="mt-4 col-span-2 p-4 border border-border bg-muted/30 rounded-md">
              <p className="text-xs font-mono font-medium text-muted-foreground mb-2 uppercase tracking-wider">Preview</p>
              <div className="text-sm font-sans whitespace-pre-wrap">
                {watchAction === 'SLACK_MESSAGE' 
                  ? getDummyPreview(JSON.stringify({ message: slackMessage })) 
                  : (
                    <>
                      <div><strong>Primary:</strong> {getDummyPreview(watchActionArgs || '')}</div>
                      {sendSlackAlert && <div className="mt-2 pt-2 border-t border-border"><strong>Secondary (Slack):</strong> {getDummyPreview(JSON.stringify({ message: slackMessage }))}</div>}
                    </>
                  )
                }
              </div>
            </div>

          </div>
          
          <Button type="submit" disabled={form.formState.isSubmitting} className="font-mono text-sm tracking-wide uppercase">
            {form.formState.isSubmitting ? 'Creating...' : 'Create Rule'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
