import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { storage } from './config/azureBlob.js';
import { startMemoryDb } from './config/memoryDb.js';
import { sweepExpiredEscrows } from './services/escrowService.js';
import { seedDemoData } from './seed/demoData.js';

async function ensureDevAdmin() {
  if (env.NODE_ENV !== 'development') return;
  const bcrypt = (await import('bcryptjs')).default;
  const { User } = await import('./models/User.js');
  const { Wallet } = await import('./models/Wallet.js');
  const email = process.env.ADMIN_EMAIL || 'admin@collavo.app';
  const exists = await User.findOne({ email });
  if (exists) return;
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'AdminPass123!', 12);
  const admin = await User.create({ email, passwordHash, role: 'admin', name: 'Collavo Admin' });
  await Wallet.findOneAndUpdate({ userId: admin._id }, { $setOnInsert: { userId: admin._id } }, { upsert: true });
  console.log(`Dev admin created: ${email}`);
}

async function main() {
  if (!env.MONGO_URI && env.NODE_ENV === 'development') {
    env.MONGO_URI = await startMemoryDb();
    console.log('Using in-memory MongoDB for development');
  }
  await connectDB();
  await storage.init();
  await ensureDevAdmin();
  await seedDemoData();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`Collavo server running on port ${env.PORT} (${env.NODE_ENV})`);
    console.log(`Admin routes mounted under /api/${env.ADMIN_ROUTE_PATH}`);
  });

  const sweep = () => sweepExpiredEscrows().catch(err => console.error('Escrow sweep failed:', err.message));
  sweep();
  setInterval(sweep, 60 * 60 * 1000);

  const shutdown = async () => {
    clearInterval(sweep);
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
