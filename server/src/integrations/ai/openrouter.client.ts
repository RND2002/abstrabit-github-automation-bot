import axios from 'axios';
import { env } from '../../config/env';

export interface AiTriageResult {
  summary: string | null;
  priority: string | null;
  suggestedLabel: string | null;
}

export const analyzeIssueOrPR = async (title: string, body: string): Promise<AiTriageResult | null> => {
  if (!env.OPENROUTER_API_KEY) {
    return null;
  }

  const prompt = `
You are an AI assistant helping to triage a GitHub Issue or Pull Request.
Please analyze the following title and body.
Return ONLY a valid JSON object matching this schema exactly (do not wrap in markdown):
{
  "summary": "A concise 1-2 sentence summary of the issue/PR",
  "priority": "High, Medium, or Low based on urgency",
  "suggestedLabel": "A single suggested label (e.g. bug, enhancement, documentation)"
}

Title: ${title}
Body: ${body}
`;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }]
      },
      {
        headers: {
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': env.FRONTEND_URL,
          'X-Title': 'Abstrabit Automation Bot'
        },
      }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (content) {
      try {
        let cleanContent = content.trim();
        // Remove markdown formatting if present
        if (cleanContent.startsWith('```')) {
          const lines = cleanContent.split('\n');
          if (lines[0].startsWith('```')) lines.shift();
          if (lines[lines.length - 1].startsWith('```')) lines.pop();
          cleanContent = lines.join('\n').trim();
        }
        
        const parsed = JSON.parse(cleanContent);
        return {
          summary: parsed.summary || null,
          priority: parsed.priority || null,
          suggestedLabel: parsed.suggestedLabel || null,
        };
      } catch (e) {
        console.error('Failed to parse OpenRouter JSON response:', content);
      }
    }
  } catch (error: any) {
    console.error('Failed to analyze with OpenRouter:', error?.response?.data || error.message);
  }

  return null;
};
