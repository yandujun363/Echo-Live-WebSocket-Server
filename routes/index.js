import { Router } from 'express';
import { apiRoutes } from './api.js';
import { pageRoutes } from './pages.js';

const router = Router();

// 挂载所有路由
router.use('/', pageRoutes);
router.use('/', apiRoutes);

export default router;