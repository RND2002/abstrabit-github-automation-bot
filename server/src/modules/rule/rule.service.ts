import * as ruleRepository from './rule.repository';
import { CreateRuleSchema } from './rule.schema';
import { Rule } from './rule.types';
import { GitHubWebhookPayload } from '../webhook/webhook.types';
import vm from 'node:vm';

export const createRule = async (data: CreateRuleSchema) => {
  return ruleRepository.createRule(data);
};

export const getRules = async (repoId: string) => {
  return ruleRepository.getRulesByRepoId(repoId);
};

export const deleteRule = async (id: string) => {
  return ruleRepository.deleteRule(id);
};

export const matchEvent = (rule: Rule, payload: string, eventType: string): boolean => {
  try {
    const parsedPayload = JSON.parse(payload) as GitHubWebhookPayload;

    // Basic event type match (e.g. "push", "issues", "pull_request")
    if (rule.event !== '*' && rule.event !== eventType) {
      return false;
    }

    if (rule.condition && rule.condition !== 'true') {
      // Evaluate the JavaScript expression provided by the frontend rule builder
      const sandbox = { payload: parsedPayload };
      vm.createContext(sandbox);
      const result = vm.runInContext(rule.condition, sandbox);
      if (!result) {
        return false;
      }
    }

    return true;
  } catch (error) {
    console.error('Error evaluating rule condition:', error);
    return false;
  }
};
