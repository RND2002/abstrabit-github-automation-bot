export const EVENT_ACTIONS_MAP: Record<string, { label: string, value: string, description: string }[]> = {
  issues: [
    { label: 'Opened', value: 'payload.action === "opened"', description: 'An issue was created' },
    { label: 'Closed', value: 'payload.action === "closed"', description: 'An issue was closed' },
    { label: 'Reopened', value: 'payload.action === "reopened"', description: 'An issue was reopened' },
    { label: 'Edited', value: 'payload.action === "edited"', description: 'Title or body changed' },
    { label: 'Labeled', value: 'payload.action === "labeled"', description: 'A label was added' },
    { label: 'Unlabeled', value: 'payload.action === "unlabeled"', description: 'A label was removed' },
    { label: 'Assigned', value: 'payload.action === "assigned"', description: 'Someone was assigned' },
    { label: 'Unassigned', value: 'payload.action === "unassigned"', description: 'Someone was unassigned' },
    { label: 'Deleted', value: 'payload.action === "deleted"', description: 'An issue was deleted' }
  ],
  pull_request: [
    { label: 'Opened', value: 'payload.action === "opened"', description: 'A PR was created' },
    { label: 'Closed', value: 'payload.action === "closed"', description: 'A PR was closed (merged or unmerged)' },
    { label: 'Merged', value: 'payload.action === "closed" && payload.pull_request.merged === true', description: 'A PR was successfully merged' },
    { label: 'Reopened', value: 'payload.action === "reopened"', description: 'A PR was reopened' },
    { label: 'Edited', value: 'payload.action === "edited"', description: 'Title or body changed' },
    { label: 'Synchronize', value: 'payload.action === "synchronize"', description: 'New commits pushed to the PR branch' },
    { label: 'Review Requested', value: 'payload.action === "review_requested"', description: 'A review was requested' },
    { label: 'Ready for Review', value: 'payload.action === "ready_for_review"', description: 'Draft PR marked ready for review' },
    { label: 'Labeled', value: 'payload.action === "labeled"', description: 'A label was added' },
  ],
  push: [
    { label: 'Default Branch Push', value: 'payload.ref === "refs/heads/" + payload.repository.default_branch', description: 'Commits pushed to the default branch' },
    { label: 'Any Push', value: 'true', description: 'Any push to any branch' }
  ],
  '*': [
    { label: 'Any Action', value: 'true', description: 'Triggers on any action for this event' }
  ]
};

export const TEMPLATE_VARIABLES = [
  '{{issue.title}}',
  '{{issue.number}}',
  '{{pull_request.title}}',
  '{{pull_request.number}}',
  '{{repository.name}}',
  '{{sender.login}}',
  '{{ai.summary}}',
  '{{ai.priority}}',
  '{{ai.suggestedLabel}}'
];
