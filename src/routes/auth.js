import { Router } from 'express';
import passport from 'passport';
import bcrypt from 'bcrypt';
import { prisma } from '../db/client.js';

const router = Router();

router.get('/login', (req, res) => {
	res.render('auth/login', { title: 'Login' });
});

router.post('/login', passport.authenticate('local', {
	successRedirect: '/dashboard',
	failureRedirect: '/login',
	failureFlash: true
}));

router.get('/register', (req, res) => {
	res.render('auth/register', { title: 'Register' });
});

router.post('/register', async (req, res) => {
	const { restaurantName, email, password } = req.body;
	if (!restaurantName || !email || !password) {
		req.flash('error', 'All fields are required');
		return res.redirect('/register');
	}
	try {
		const slug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
		const existing = await prisma.restaurant.findUnique({ where: { slug } });
		if (existing) {
			req.flash('error', 'Restaurant name is taken');
			return res.redirect('/register');
		}
		const restaurant = await prisma.restaurant.create({ data: { name: restaurantName, slug } });
		const passwordHash = await bcrypt.hash(password, 10);
		await prisma.user.create({ data: { email, passwordHash, restaurantId: restaurant.id } });
		req.flash('success', 'Account created. Please login.');
		return res.redirect('/login');
	} catch (err) {
		req.flash('error', 'Registration failed');
		return res.redirect('/register');
	}
});

router.post('/logout', (req, res, next) => {
	req.logout(err => {
		if (err) return next(err);
		res.redirect('/login');
	});
});

export default router;


