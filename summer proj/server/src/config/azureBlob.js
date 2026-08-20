import fs from 'fs';
import path from 'path';
import { env } from './env.js';

const LOCAL_STORAGE_ROOT = path.resolve(process.cwd(), 'uploads');
const privateContainer = env.AZURE_BLOB_PRIVATE_CONTAINER;

let azure = null;
let hasAzure = false;

async function initAzure() {
  if (azure || !env.AZURE_BLOB_CONNECTION_STRING) return;
  try {
    const { BlobServiceClient } = await import('@azure/storage-blob');
    azure = BlobServiceClient.fromConnectionString(env.AZURE_BLOB_CONNECTION_STRING);
    await azure.createContainer(privateContainer, { access: 'private' });
    hasAzure = true;
    console.log('Azure Blob Storage initialized');
  } catch (err) {
    console.warn('Azure Blob init failed, falling back to local storage:', err.message);
  }
}

async function ensureLocalDir(blobPath) {
  const dir = path.dirname(path.join(LOCAL_STORAGE_ROOT, blobPath));
  await fs.promises.mkdir(dir, { recursive: true });
}

export const storage = {
  async init() {
    await initAzure();
    await fs.promises.mkdir(LOCAL_STORAGE_ROOT, { recursive: true });
  },

  async upload({ blobPath, data, contentType }) {
    if (hasAzure) {
      const client = azure.getContainerClient(privateContainer).getBlockBlobClient(blobPath);
      await client.upload(data, data.length, {
        blobHTTPHeaders: { blobContentType: contentType }
      });
      return { blobPath, azure: true };
    }
    await ensureLocalDir(blobPath);
    await fs.promises.writeFile(path.join(LOCAL_STORAGE_ROOT, blobPath), data);
    return { blobPath, azure: false };
  },

  async signedUrl(blobPath, ttlSeconds = 600, baseUrl = '') {
    if (hasAzure) {
      const { generateBlobSASQueryParameters, StorageSharedKeyCredential, SASProtocol } = await import('@azure/storage-blob');
      const parsed = env.AZURE_BLOB_CONNECTION_STRING.split(';').reduce((acc, part) => {
        const [k, ...v] = part.split('=');
        acc[k] = v.join('=');
        return acc;
      }, {});
      const credential = new StorageSharedKeyCredential(parsed.AccountName, parsed.AccountKey);
      const expiry = new Date(Date.now() + ttlSeconds * 1000);
      const sas = generateBlobSASQueryParameters(
        {
          containerName: privateContainer,
          blobName: blobPath,
          permissions: 'r',
          startsOn: new Date(),
          expiresOn: expiry,
          protocol: SASProtocol.Https
        },
        credential
      ).toString();
      const client = azure.getContainerClient(privateContainer).getBlockBlobClient(blobPath);
      return `${client.url}?${sas}`;
    }
    const filePath = path.join(LOCAL_STORAGE_ROOT, blobPath);
    if (!fs.existsSync(filePath)) return null;
    return `/uploads/${blobPath}`;
  },

  async delete(blobPath) {
    if (hasAzure) {
      const client = azure.getContainerClient(privateContainer).getBlockBlobClient(blobPath);
      await client.deleteIfExists();
      return;
    }
    const filePath = path.join(LOCAL_STORAGE_ROOT, blobPath);
    if (fs.existsSync(filePath)) await fs.promises.unlink(filePath);
  },

  isAzure() {
    return hasAzure;
  }
};
