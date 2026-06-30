import { githubClient } from '../../integrations/github/github.client';

export const addLabel = async (
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  labels: string[]
) => {
  await githubClient.post(
    `/repos/${owner}/${repo}/issues/${issueNumber}/labels`,
    { labels },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
};

export const postComment = async (
  accessToken: string,
  owner: string,
  repo: string,
  issueNumber: number,
  body: string
) => {
  await githubClient.post(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    { body },
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
};
