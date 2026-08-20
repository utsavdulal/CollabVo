import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Wallet } from '../models/Wallet.js';

const email = process.argv[2] || 'admin@collavo.app';
const password = process.argv[3] || 'AdminPass123!';
const name = process.argv[4] || 'Collavo Admin';

async function run() {
  await mongoose.connect(env.MONGO_URI);
  const existing = await User.findOne({ email });
  if (existing) {
    console.log(`Admin already exists for ${email}`);
    await mongoose.disconnect();
    return;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await User.create({ email, passwordHash, role: 'admin', name });
  await Wallet.findOneAndUpdate(
    { userId: admin._id },
    { $setOnInsert: { userId: admin._id } },
    { upsert: true }
  );
  console.log(`Admin created: ${email}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
