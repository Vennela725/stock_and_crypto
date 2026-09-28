import express from 'express';
import { getAssets, getAssetById, getAssetBySymbol } from '../controllers/assetController.js';

const router = express.Router();

router.get('/', getAssets);
router.get('/symbol/:symbol', getAssetBySymbol);
router.get('/:id', getAssetById);

export default router;
