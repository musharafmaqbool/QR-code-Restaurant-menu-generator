import { Router } from 'express';
import QRCode from 'qrcode';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/:slug', async (req, res) => {
	const { slug } = req.params;
	const restaurant = await prisma.restaurant.findUnique({
		where: { slug },
		include: {
			sections: { include: { dishes: { where: { isAvailable: true }, orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }
		}
	});
	if (!restaurant) return res.status(404).send('Not found');
	return res.render('public/menu', { title: restaurant.name, restaurant });
});

router.get('/:slug/qr', async (req, res) => {
	const { slug } = req.params;
	const base = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
	const url = `${base}/m/${slug}`;
	try {
		const png = await QRCode.toBuffer(url, { width: 512, margin: 1 });
		res.setHeader('Content-Type', 'image/png');
		return res.send(png);
	} catch (_) {
		return res.status(500).send('QR generation failed');
	}
});

export default router;


