import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import searchRoutes from './routes/search.js';
import syncRoutes from './routes/sync.js';
import adminRoutes from './routes/admin.js';
import { errorMiddleware } from './middleware/error.js';

dotenv.config();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/admin', adminRoutes);

app.use(errorMiddleware);

export default app;
