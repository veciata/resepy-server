import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { getUserRecipes, upsertUserRecipes } from '../services/recipeService.js';

const router = Router();

router.post(
  '/push',
  requireAuth,
  asyncHandler(async (req, res) => {
    const recipes = req.body?.recipes;
    if (!Array.isArray(recipes)) {
      return res.status(400).json({ message: 'recipes array required' });
    }
    await upsertUserRecipes(req.user.id, recipes);
    res.status(201).json({ ok: true, count: recipes.length });
  }),
);

router.get(
  '/pull',
  requireAuth,
  asyncHandler(async (req, res) => {
    const recipes = await getUserRecipes(req.user.id);
    res.json({ recipes });
  }),
);

export default router;
