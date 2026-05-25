import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { scrapeRecipe } from '../services/scraperService.js';
import pool from '../config/db.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'url is required' });
    }

    const scraped = await scrapeRecipe(url);

    const [result] = await pool.query(
      `INSERT INTO recipes (user_id, image_url, is_my_recipe, is_pending)
       VALUES (:userId, :imageUrl, 1, 0)`,
      { userId: req.user.id, imageUrl: scraped.imageUrl },
    );

    const recipeId = result.insertId;

    await pool.query(
      `INSERT INTO recipe_texts (recipe_id, language, title, description, ingredients, instructions)
       VALUES (:recipeId, 'tr', :title, :description, :ingredients, :instructions)`,
      {
        recipeId,
        title: scraped.title,
        description: '',
        ingredients: scraped.ingredients,
        instructions: scraped.instructions,
      },
    );

    const recipe = {
      id: String(recipeId),
      title: scraped.title,
      name: scraped.title,
      ingredients: scraped.ingredients,
      instructions: scraped.instructions,
      imageUrl: scraped.imageUrl,
      image_url: scraped.imageUrl,
      sourceUrl: url,
    };

    res.json(recipe);
  }),
);

export default router;
