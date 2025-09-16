import path from 'path';
import express from 'express';
import session from 'express-session';
import flash from 'connect-flash';
import passport from 'passport';
import morgan from 'morgan';
import helmet from 'helmet';
import compression from 'compression';
import csrf from 'csurf';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';
import fs from 'fs';
import { prisma } from './db/client.js';

import './config/passport.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import publicRoutes from './routes/public.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '..', 'public')));
// Local uploads dir (serve static)
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);
app.use('/uploads', express.static(uploadsDir));

const sessionSecret = process.env.SESSION_SECRET || 'dev_secret_change_me';
app.use(
	session({
		secret: sessionSecret,
		resave: false,
		saveUninitialized: false,
		cookie: { httpOnly: true }
	})
);
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

// CSRF after sessions
app.use(csrf());
app.use((req, res, next) => {
	res.locals.csrfToken = req.csrfToken();
	res.locals.user = req.user || null;
	res.locals.flash = {
		success: req.flash('success'),
		error: req.flash('error')
	};
	res.locals.APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';
	next();
});

// Attach restaurant info for navbar when authenticated
app.use(async (req, res, next) => {
	if (req.user && req.user.restaurantId) {
		try {
			const restaurant = await prisma.restaurant.findUnique({ where: { id: req.user.restaurantId } });
			res.locals.restaurant = restaurant;
		} catch (_) {
			res.locals.restaurant = null;
		}
	}
	return next();
});

app.get('/', (req, res) => {
	return res.render('home/index', { title: 'Digital menu made easy', useBitcountFont: true });
});

app.use(authRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/m', publicRoutes);

app.use((err, req, res, next) => {
	if (err && err.code === 'EBADCSRFTOKEN') {
		return res.status(403).send('Invalid CSRF token');
	}
	return next(err);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
	// eslint-disable-next-line no-console
	console.log(`Server running on http://localhost:${port}`);
});


