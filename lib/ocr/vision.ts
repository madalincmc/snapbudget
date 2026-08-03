import { GoogleAuth } from 'google-auth-library';

let auth: GoogleAuth | null = null;

function getAuth() {
  if (!auth) {
    const base64 = process.env.GOOGLE_VISION_CREDENTIALS_BASE64;
    if (!base64) {
      throw new Error('GOOGLE_VISION_CREDENTIALS_BASE64 is not set');
    }
    const credentials = JSON.parse(Buffer.from(base64, 'base64').toString('utf8'));
    auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
  }
  return auth;
}

export async function detectText(imageBase64: string): Promise<string> {
  const client = await getAuth().getClient();
  const { token } = await client.getAccessToken();

  const response = await fetch('https://vision.googleapis.com/v1/images:annotate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          image: { content: imageBase64 },
          features: [{ type: 'TEXT_DETECTION' }],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Vision API error ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.responses?.[0]?.fullTextAnnotation?.text ?? '';
}
