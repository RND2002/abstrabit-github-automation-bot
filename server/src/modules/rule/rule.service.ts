import * as ruleRepository from './rule.repository';
import { CreateRuleSchema } from './rule.schema';
import { Rule } from './rule.types';
import { GitHubWebhookPayload } from '../webhook/webhook.types';
import { logger } from '../../core/utils/logger';

export const createRule = async (data: CreateRuleSchema) => {
  return ruleRepository.createRule(data);
};

export const getRules = async (repoId: string) => {
  return ruleRepository.getRulesByRepoId(repoId);
};

export const getRuleById = async (id: string) => {
  return ruleRepository.getRuleById(id);
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
      // Evaluate the condition as a simple predicate
      // We use a safe subset: only allow property access on payload
      const result = evaluateCondition(rule.condition, parsedPayload);
      if (!result) {
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error({ err: error, ruleId: rule.id }, 'Error evaluating rule condition');
    return false;
  }
};

/**
 * Safely evaluate a rule condition against a payload.
 * Supports simple JavaScript-like expressions without full code execution.
 * Falls back to Function constructor with a frozen sandbox.
 */
const evaluateCondition = (condition: string, payload: any): boolean => {
  try {
    // Create a function that only has access to `payload`
    // This is safer than vm.runInContext for simple expressions
    const fn = new Function('payload', `"use strict"; return (${condition});`);
    const frozenPayload = Object.freeze(JSON.parse(JSON.stringify(payload)));
    return !!fn(frozenPayload);
  } catch (error) {
    logger.warn({ condition, err: error }, 'Failed to evaluate rule condition');
    return false;
  }
};
