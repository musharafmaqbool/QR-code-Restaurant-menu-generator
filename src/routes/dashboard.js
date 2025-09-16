import { Router } from 'express';
import { prisma } from '../db/client.js';
import { upload } from '../middleware/upload.js';

const router = Router();

function ensureAuth(req, res, next) {
	if (req.isAuthenticated && req.isAuthenticated()) return next();
	return res.redirect('/login');
}

router.get('/', ensureAuth, async (req, res) => {
	const restaurantId = req.user.restaurantId;
	const restaurant = await prisma.restaurant.findUnique({
		where: { id: restaurantId },
		include: {
			sections: { include: { dishes: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } }
		}
	});
	res.render('dashboard/index', { title: 'Dashboard', restaurant });
});

router.post('/section', ensureAuth, async (req, res) => {
	const { name } = req.body;
	if (!name) return res.redirect('/dashboard');
	await prisma.section.create({ data: { name, restaurantId: req.user.restaurantId } });
	return res.redirect('/dashboard');
});

router.post('/section/:id/delete', ensureAuth, async (req, res) => {
	const { id } = req.params;
	await prisma.section.delete({ where: { id } });
	return res.redirect('/dashboard');
});

router.post('/dish', ensureAuth, upload.single('image'), async (req, res) => {
	const { sectionId, name, description, priceCents } = req.body;
	if (!sectionId || !name || !priceCents) return res.redirect('/dashboard');
	const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;
	await prisma.dish.create({ data: { sectionId, name, description, priceCents: Number(priceCents), imageUrl } });
	return res.redirect('/dashboard');
});

router.post('/dish/:id/delete', ensureAuth, async (req, res) => {
	const { id } = req.params;
	await prisma.dish.delete({ where: { id } });
	return res.redirect('/dashboard');
});

router.post('/restaurant', ensureAuth, upload.single('logo'), async (req, res) => {
	const { name, address, phone } = req.body;
	const data = { name, address, phone };
	if (req.file) data.logoUrl = `/uploads/${req.file.filename}`;
	await prisma.restaurant.update({ where: { id: req.user.restaurantId }, data });
	return res.redirect('/dashboard');
});

export default router;


