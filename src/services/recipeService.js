import pool from '../config/db.js';
import { AppError } from '../middleware/error.js';

function rowToRecipe(row, texts) {
  return {
    id: String(row.id),
    title: texts?.title || row.title || '',
    name: texts?.title || row.title || '',
    description: texts?.description || row.description || '',
    ingredients: texts?.ingredients || row.ingredients || '',
    instructions: texts?.instructions || row.instructions || '',
    imageUrl: row.image_url,
    image_url: row.image_url,
    categoryId: row.category_id,
    isMyRecipe: row.is_my_recipe,
    isPending: row.is_pending,
    likes: row.likes,
    userId: row.user_id,
    language: texts?.language || 'tr',
  };
}

export async function searchRecipes(query, language = 'tr') {
  const term = `%${query}%`;
  const [rows] = await pool.query(
    `SELECT r.*, rt.title, rt.description, rt.ingredients, rt.instructions, rt.language, u.username
     FROM recipes r
     JOIN recipe_texts rt ON rt.recipe_id = r.id AND rt.language = :language
     JOIN users u ON u.id = r.user_id
     WHERE r.is_pending = 0
       AND (rt.title LIKE :term OR rt.description LIKE :term OR rt.ingredients LIKE :term)
     ORDER BY r.updated_at DESC
     LIMIT 50`,
    { term, language },
  );
  return rows.map((row) => rowToRecipe(row, row));
}

export async function getUserRecipes(userId) {
  const [rows] = await pool.query(
    `SELECT r.*, rt.title, rt.description, rt.ingredients, rt.instructions, rt.language
     FROM recipes r
     LEFT JOIN recipe_texts rt ON rt.recipe_id = r.id AND rt.language = 'tr'
     WHERE r.user_id = :userId AND r.is_my_recipe = 1`,
    { userId },
  );
  return rows.map((row) => rowToRecipe(row, row));
}

export async function upsertUserRecipes(userId, recipes) {
  for (const recipe of recipes) {
    const title = recipe.title || recipe.name;
    if (!title) continue;

    if (recipe.id) {
      const [existing] = await pool.query(
        'SELECT id FROM recipes WHERE id = :id AND user_id = :userId',
        { id: recipe.id, userId },
      );
      if (existing.length) {
        await pool.query(
          `UPDATE recipes SET image_url = :imageUrl, updated_at = NOW()
           WHERE id = :id AND user_id = :userId`,
          {
            id: recipe.id,
            userId,
            imageUrl: recipe.imageUrl || recipe.image_url || null,
          },
        );

        const language = recipe.language || 'tr';
        await pool.query(
          `INSERT INTO recipe_texts (recipe_id, language, title, description, ingredients, instructions)
           VALUES (:recipeId, :language, :title, :description, :ingredients, :instructions)
           ON DUPLICATE KEY UPDATE
             title = VALUES(title),
             description = VALUES(description),
             ingredients = VALUES(ingredients),
             instructions = VALUES(instructions)`,
          {
            recipeId: recipe.id,
            language,
            title,
            description: recipe.description || '',
            ingredients:
              typeof recipe.ingredients === 'string'
                ? recipe.ingredients
                : Array.isArray(recipe.ingredients)
                  ? recipe.ingredients.join('\n')
                  : '',
            instructions: recipe.instructions || '',
          },
        );
        continue;
      }
    }

    const [result] = await pool.query(
      `INSERT INTO recipes (user_id, image_url, is_my_recipe, is_pending)
       VALUES (:userId, :imageUrl, 1, 0)`,
      {
        userId,
        imageUrl: recipe.imageUrl || recipe.image_url || null,
      },
    );

    const recipeId = result.insertId;
    const language = recipe.language || 'tr';

    await pool.query(
      `INSERT INTO recipe_texts (recipe_id, language, title, description, ingredients, instructions)
       VALUES (:recipeId, :language, :title, :description, :ingredients, :instructions)`,
      {
        recipeId,
        language,
        title,
        description: recipe.description || '',
        ingredients:
          typeof recipe.ingredients === 'string'
            ? recipe.ingredients
            : Array.isArray(recipe.ingredients)
              ? recipe.ingredients.join('\n')
              : '',
        instructions: recipe.instructions || '',
      },
    );
  }
}

export async function getPendingRecipes() {
  const [rows] = await pool.query(
    `SELECT r.id, rt.title AS name, r.image_url AS imageUrl, r.created_at AS savedAt, u.username
     FROM recipes r
     JOIN recipe_texts rt ON rt.recipe_id = r.id AND rt.language = 'tr'
     JOIN users u ON u.id = r.user_id
     WHERE r.is_pending = 1
     ORDER BY r.created_at ASC`,
  );
  return rows.map((row) => ({
    id: String(row.id),
    name: row.name,
    username: row.username,
    savedAt: row.savedAt,
    imageUrl: row.imageUrl,
  }));
}

export async function getRecipeById(id, language = 'tr') {
  const [rows] = await pool.query(
    `SELECT r.*, rt.title, rt.description, rt.ingredients, rt.instructions, rt.language, u.username
     FROM recipes r
     JOIN recipe_texts rt ON rt.recipe_id = r.id AND rt.language = :language
     JOIN users u ON u.id = r.user_id
     WHERE r.id = :id`,
    { id, language },
  );

  if (rows.length === 0) {
    const [fallback] = await pool.query(
      `SELECT r.*, rt.title, rt.description, rt.ingredients, rt.instructions, rt.language, u.username
       FROM recipes r
       JOIN recipe_texts rt ON rt.recipe_id = r.id
       JOIN users u ON u.id = r.user_id
       WHERE r.id = :id
       LIMIT 1`,
      { id },
    );
    if (!fallback.length) throw new AppError('Recipe not found', 404);
    return { ...rowToRecipe(fallback[0], fallback[0]), username: fallback[0].username };
  }

  return { ...rowToRecipe(rows[0], rows[0]), username: rows[0].username };
}

export async function approveRecipe(id) {
  const [result] = await pool.query(
    'UPDATE recipes SET is_pending = 0, updated_at = NOW() WHERE id = :id',
    { id },
  );
  if (result.affectedRows === 0) throw new AppError('Recipe not found', 404);
}

export async function rejectRecipe(id) {
  const [result] = await pool.query('DELETE FROM recipes WHERE id = :id', { id });
  if (result.affectedRows === 0) throw new AppError('Recipe not found', 404);
}
