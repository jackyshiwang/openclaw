import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import sequelize from '../src/models/index.js';
import { Question } from '../src/models/Question.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');

    // Sync models (create tables)
    // Note: force: true drops the table if it exists
    await Question.sync({ force: true });
    console.log('Question table created.');

    const dataPath = path.join(__dirname, '../Momen/questions_database.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    const json = JSON.parse(data);

    const questions = json.questions.map((q: any) => ({
      id: q.id,
      content: q.level_1,
      dimension: q.dimension,
    }));

    await Question.bulkCreate(questions);
    console.log(`Seeded ${questions.length} questions.`);

    await sequelize.close();
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    process.exit(1);
  }
}

seed();

