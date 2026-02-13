import { Sequelize } from "sequelize";

const dbName = process.env.DB_NAME || "momen_db";
const dbUser = process.env.DB_USER || "root";
const dbPass = process.env.DB_PASS || "password";
const dbHost = process.env.DB_HOST || "127.0.0.1";

console.log(`[DB Config] Connecting to ${dbName} at ${dbHost} as ${dbUser}`);

const sequelize = new Sequelize(dbName, dbUser, dbPass, {
  host: dbHost,
  dialect: "mysql",
  logging: false, // Set to console.log to see SQL queries
});

export async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connection established");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    return false;
  }
}

export default sequelize;
