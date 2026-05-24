import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { searchRecipes } from '../services/recipeService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').toString().trim();
    const language = (req.query.language || 'en').toString();
    if (!q) {
      return res.json({ recipes: [] });
    }
    const recipes = await searchRecipes(q, language);
    res.json({ recipes });
  }),
);

export default router;
