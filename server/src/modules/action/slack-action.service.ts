import axios from 'axios';

export const postToWebhookUrl = async (webhookUrl: string, message: string) => {
  await axios.post(webhookUrl, {
    text: message,
  });
};
