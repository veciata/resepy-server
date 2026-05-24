import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import {
  getPendingRecipes,
  getRecipeById,
  approveRecipe,
  rejectRecipe,
} from '../services/recipeService.js';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get(
  '/pending',
  asyncHandler(async (_req, res) => {
    const pending = await getPendingRecipes();
    res.json(pending);
  }),
);

router.get(
  '/recipes/:id',
  asyncHandler(async (req, res) => {
    const recipe = await getRecipeById(req.params.id);
    res.json(recipe);
  }),
);

router.put(
  '/recipes/:id/approve',
  asyncHandler(async (req, res) => {
    await approveRecipe(req.params.id);
    res.json({ ok: true, status: 'approved' });
  }),
);

router.put(
  '/recipes/:id/reject',
  asyncHandler(async (req, res) => {
    await rejectRecipe(req.params.id);
    res.json({ ok: true, status: 'rejected' });
  }),
);

export default router;
