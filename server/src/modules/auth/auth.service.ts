import { exchangeCodeForToken, getUserProfile } from '../../integrations/github/github.client';
import { upsertFromGithub } from '../user/user.service';
import { createSession } from '../session/session.service';

export const handleGithubCallback = async (code: string) => {
  // 1. Exchange code for access token
  const accessToken = await exchangeCodeForToken(code);

  // 2. Get user profile from GitHub
  const profile = await getUserProfile(accessToken);

  // 3. Upsert user in database
  const user = await upsertFromGithub({
    githubId: profile.id.toString(),
    email: profile.email,
    username: profile.login,
    avatarUrl: profile.avatar_url,
  });

  // 4. Create session
  const session = await createSession(user.id, accessToken);

  return { user, session };
};
