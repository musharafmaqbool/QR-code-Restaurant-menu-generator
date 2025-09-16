import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { prisma } from '../db/client.js';

passport.use(
	new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
		try {
			const user = await prisma.user.findUnique({ where: { email } });
			if (!user) return done(null, false, { message: 'Invalid credentials' });
			const ok = await bcrypt.compare(password, user.passwordHash);
			if (!ok) return done(null, false, { message: 'Invalid credentials' });
			return done(null, { id: user.id, email: user.email, restaurantId: user.restaurantId });
		} catch (err) {
			return done(err);
		}
	})
);

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await prisma.user.findUnique({ where: { id } });
		if (!user) return done(null, false);
		return done(null, { id: user.id, email: user.email, restaurantId: user.restaurantId });
	} catch (err) {
		return done(err);
	}
});

export default passport;


