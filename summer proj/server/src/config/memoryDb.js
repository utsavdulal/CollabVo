let mongod = null;

export async function startMemoryDb() {
  const { MongoMemoryReplSet } = await import('mongodb-memory-server');
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  return mongod.getUri();
}

export async function stopMemoryDb() {
  if (mongod) await mongod.stop();
}
