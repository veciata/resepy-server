import pool from '../src/config/db.js';
import dotenv from 'dotenv';

dotenv.config();

async function migrateTexts() {
  console.log('Checking recipe_texts table...');

  const [tableExists] = await pool.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'recipe_texts'`,
    { db: process.env.DB_NAME || 'tsresepy' },
  );

  if (tableExists.length === 0) {
    await pool.query(`
      CREATE TABLE recipe_texts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        recipe_id INT NOT NULL,
        language CHAR(2) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        ingredients TEXT,
        instructions TEXT,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
        UNIQUE KEY uq_recipe_language (recipe_id, language),
        FULLTEXT INDEX ft_recipe_texts (title, description, ingredients, instructions)
      )
    `);
    console.log('Created recipe_texts table.');
  } else {
    console.log('recipe_texts table already exists.');
  }

  const [existingCount] = await pool.query(
    'SELECT COUNT(*) AS cnt FROM recipe_texts',
  );
  if (existingCount[0].cnt > 0) {
    console.log(
      `recipe_texts already has ${existingCount[0].cnt} rows — skipping migration.`,
    );
    return;
  }

  const [hasTitleColumn] = await pool.query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = :db AND TABLE_NAME = 'recipes' AND COLUMN_NAME = 'title'`,
    { db: process.env.DB_NAME || 'tsresepy' },
  );

  if (hasTitleColumn.length === 0) {
    console.log('recipes table already migrated (no title column).');
    return;
  }

  console.log('Migrating existing recipe text data...');

  const [recipes] = await pool.query(
    'SELECT id, title, description, ingredients, instructions FROM recipes WHERE title IS NOT NULL',
  );

  for (const recipe of recipes) {
    await pool.query(
      `INSERT INTO recipe_texts (recipe_id, language, title, description, ingredients, instructions)
       VALUES (:id, 'tr', :title, :description, :ingredients, :instructions)
       ON DUPLICATE KEY UPDATE title = VALUES(title)`,
      {
        id: recipe.id,
        title: recipe.title || '',
        description: recipe.description || '',
        ingredients: recipe.ingredients || '',
        instructions: recipe.instructions || '',
      },
    );
  }

  console.log(`Migrated ${recipes.length} recipes to tr initially.`);

  await pool.query(
    `ALTER TABLE recipes
     DROP INDEX ft_recipes,
     DROP COLUMN title,
     DROP COLUMN description,
     DROP COLUMN ingredients,
     DROP COLUMN instructions`,
  );
  console.log('Dropped text columns from recipes table.');
}

migrateTexts()
  .then(() => {
    console.log('Migration complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
