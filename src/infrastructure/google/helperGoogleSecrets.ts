import AWS from 'aws-sdk';

const ssm = new AWS.SSM();

export async function getGoogleSecrets(): Promise<Record<string, string>> {
  const paramNames = [
    '/myapp/GOOGLE_TYPE',
    '/myapp/GOOGLE_PROJECT_ID',
    '/myapp/GOOGLE_PRIVATE_KEY_ID',
    '/myapp/GOOGLE_PRIVATE_KEY',
    '/myapp/GOOGLE_CLIENT_EMAIL',
    '/myapp/GOOGLE_CLIENT_ID',
    '/myapp/GOOGLE_UNIVERSE_DOMAIN',
    '/myapp/SHARED_FOLDER_EMAIL',
    '/myapp/SUPABASE_URL',
    '/myapp/SUPABASE_KEY',
    '/myapp/DOCUMENTS_API_URL',
  ];

  const chunkSize = 10;
  let allParams: AWS.SSM.Parameter[] = [];

  for (let i = 0; i < paramNames.length; i += chunkSize) {
    const chunk = paramNames.slice(i, i + chunkSize);
    const result = await ssm.getParameters({
      Names: chunk,
      WithDecryption: true
    }).promise();
    allParams = allParams.concat(result.Parameters || []);
  }

  const secrets: Record<string, string> = {};
  allParams.forEach(param => {
    const key = param.Name?.split('/').pop()!;
    secrets[key] = param.Value!;
  });

  return secrets;
}