import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log(`✅ Loaded .env from ${envPath}`);
} else {
  console.warn(`⚠️  .env file not found at ${envPath}`);
}

const requiredKeys = ['DB_HOST', 'DB_USER', 'DB_NAME'];
let missing = false;

console.log('--- Environment Check ---');
requiredKeys.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    missing = true;
  } else {
    console.log(`✅ ${key}=${process.env[key]}`);
  }
});

// Check DB_PASS separately as it can be empty
if (process.env.DB_PASS === undefined) {
  console.error(`❌ Missing required environment variable: DB_PASS (can be empty but must exist)`);
  missing = true;
} else {
  console.log(`✅ DB_PASS=******`);
}

if (missing) {
  console.error('\n💥 Environment check FAILED. Please check your .env file.');
  process.exit(1);
} else {
  console.log('\n🎉 Environment check PASSED.');
  process.exit(0);
}

