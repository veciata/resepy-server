import pool from '../config/db.js';
import { AppError } from '../middleware/error.js';

function rowToRecipe(row) {
  return {
    id: String(row.id),
    title: row.title,
    name: row.title,
    description: row.description,
    ingredients: row.ingredients,
    instructions: row.instructions,
    imageUrl: row.image_url,
    image_url: row.image_url,
    categoryId: row.category_id,
    isMyRecipe: row.is_my_recipe,
    isPending: row.is_pending,
    likes: row.likes,
    userId: row.user_id,
  };
}

export async function searchRecipes(query, _language = 'en') {
  const term = `%${query}%`;
  const [rows] = await pool.query(
    `SELECT r.*, u.username FROM recipes r
     JOIN users u ON u.id = r.user_id
     WHERE r.is_pending = 0
       AND (r.title LIKE :term OR r.description LIKE :term OR r.ingredients LIKE :term)
     ORDER BY r.updated_at DESC
     LIMIT 50`,
    { term },
  );
  return rows.map(rowToRecipe);
}

export async function getUserRecipes(userId) {
  const [rows] = await pool.query(
    'SELECT * FROM recipes WHERE user_id = :userId AND is_my_recipe = 1',
    { userId },
  );
  return rows.map(rowToRecipe);
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
          `UPDATE recipes SET title = :title, description = :description,
           ingredients = :ingredients, instructions = :instructions,
           image_url = :imageUrl, updated_at = NOW()
           WHERE id = :id AND user_id = :userId`,
          {
            id: recipe.id,
            userId,
            title,
            description: recipe.description || null,
            ingredients:
              typeof recipe.ingredients === 'string'
                ? recipe.ingredients
                : Array.isArray(recipe.ingredients)
                  ? recipe.ingredients.join('\n')
                  : null,
            instructions: recipe.instructions || null,
            imageUrl: recipe.imageUrl || recipe.image_url || null,
          },
        );
        continue;
      }
    }

    await pool.query(
      `INSERT INTO recipes (user_id, title, description, ingredients, instructions, image_url, is_my_recipe, is_pending)
       VALUES (:userId, :title, :description, :ingredients, :instructions, :imageUrl, 1, 0)`,
      {
        userId,
        title,
        description: recipe.description || null,
        ingredients:
          typeof recipe.ingredients === 'string'
            ? recipe.ingredients
            : Array.isArray(recipe.ingredients)
              ? recipe.ingredients.join('\n')
              : null,
        instructions: recipe.instructions || null,
        imageUrl: recipe.imageUrl || recipe.image_url || null,
      },
    );
  }
}

export async function getPendingRecipes() {
  const [rows] = await pool.query(
    `SELECT r.id, r.title AS name, r.image_url AS imageUrl, r.created_at AS savedAt, u.username
     FROM recipes r
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

export async function getRecipeById(id) {
  const [rows] = await pool.query(
    `SELECT r.*, u.username FROM recipes r
     JOIN users u ON u.id = r.user_id WHERE r.id = :id`,
    { id },
  );
  if (!rows.length) throw new AppError('Recipe not found', 404);
  return { ...rowToRecipe(rows[0]), username: rows[0].username };
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
