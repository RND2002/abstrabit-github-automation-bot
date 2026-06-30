import axios from 'axios';
import { env } from '../../config/env';

export const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  headers: {
    Accept: 'application/vnd.github.v3+json',
  },
});

export const exchangeCodeForToken = async (code: string) => {
  const response = await axios.post(
    'https://github.com/login/oauth/access_token',
    {
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: env.GITHUB_REDIRECT_URI,
    },
    {
      headers: {
        Accept: 'application/json',
      },
    }
  );

  if (response.data.error) {
    throw new Error(response.data.error_description || 'Failed to exchange code');
  }

  return response.data.access_token;
};

export const getUserProfile = async (accessToken: string) => {
  const response = await githubClient.get('/user', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  return response.data;
};

export const listUserRepos = async (accessToken: string) => {
  const response = await githubClient.get('/user/repos', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    params: {
      per_page: 100,
      sort: 'updated',
    },
  });

  return response.data;
};

export const createWebhook = async (
  accessToken: string,
  owner: string,
  repo: string,
  webhookUrl: string,
  secret: string
) => {
  const response = await githubClient.post(
    `/repos/${owner}/${repo}/hooks`,
    {
      name: 'web',
      active: true,
      events: ['*'], // Or specifically ['issues', 'pull_request', 'push']
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret: secret,
        insecure_ssl: '0',
      },
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
};

export const deleteWebhook = async (
  accessToken: string,
  owner: string,
  repo: string,
  hookId: number
) => {
  await githubClient.delete(`/repos/${owner}/${repo}/hooks/${hookId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
