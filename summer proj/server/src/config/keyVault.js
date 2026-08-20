import { env } from './env.js';

let cache = new Map();
let client = null;

export async function keyVault() {
  if (!env.AZURE_KEYVAULT_URL) return {
    getSecret: async (name) => process.env[name] || null
  };
  const { SecretClient } = await import('@azure/keyvault-secrets');
  const { DefaultAzureCredential } = await import('@azure/identity');
  if (!client) {
    client = new SecretClient(env.AZURE_KEYVAULT_URL, new DefaultAzureCredential());
  }
  return {
    async getSecret(name) {
      if (cache.has(name)) return cache.get(name);
      try {
        const secret = await client.getSecret(name);
        cache.set(name, secret.value);
        return secret.value;
      } catch (err) {
        console.warn(`KeyVault secret "${name}" not found, falling back to env:`, err.message);
        return process.env[name] || null;
      }
    }
  };
}
