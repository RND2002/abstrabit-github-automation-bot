import { prisma } from '../../core/db/prisma';
import { Rule } from './rule.types';
import { CreateRuleSchema } from './rule.schema';

export const createRule = async (data: CreateRuleSchema): Promise<Rule> => {
  return prisma.rule.create({
    data: {
      repoId: data.repoId,
      name: data.name,
      event: data.event,
      condition: data.condition,
      action: data.action,
      isActive: data.isActive,
      actionArgs: data.actionArgs ?? null,
      slackWebhookUrl: data.slackWebhookUrl ?? null,
      slackMessage: data.slackMessage ?? null,
      slackAlert: data.slackAlert ?? false,
    },
  });
};

export const getRulesByRepoId = async (repoId: string): Promise<Rule[]> => {
  return prisma.rule.findMany({
    where: { repoId },
  });
};

export const getActiveRulesByRepoId = async (repoId: string): Promise<Rule[]> => {
  return prisma.rule.findMany({
    where: { repoId, isActive: true },
  });
};

export const getRuleById = async (id: string): Promise<Rule | null> => {
  return prisma.rule.findUnique({
    where: { id },
  });
};

export const deleteRule = async (id: string): Promise<void> => {
  await prisma.rule.delete({
    where: { id },
  });
};
