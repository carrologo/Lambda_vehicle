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
  ];

  const result = await ssm.getParameters({
    Names: paramNames,
    WithDecryption: true
  }).promise();

  const secrets: Record<string, string> = {};
  result.Parameters?.forEach(param => {
    const key = param.Name?.split('/').pop()!;
    secrets[key] = param.Value!;
  });

  return secrets;
}