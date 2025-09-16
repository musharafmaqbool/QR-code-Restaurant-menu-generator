import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
	const email = 'demo@qrmenu.local';
	const password = 'demo1234';
	const passwordHash = await bcrypt.hash(password, 10);

	const slug = 'demo-bistro';

	const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } });
	if (existingRestaurant) {
		console.log('Demo data already exists. Skipping.');
		return;
	}

	const restaurant = await prisma.restaurant.create({
		data: {
			name: 'Demo Bistro',
			slug
		}
	});

	await prisma.user.create({
		data: {
			email,
			passwordHash,
			restaurantId: restaurant.id
		}
	});

	const starters = await prisma.section.create({
		data: { name: 'Starters', sortOrder: 1, restaurantId: restaurant.id }
	});
	const mains = await prisma.section.create({
		data: { name: 'Mains', sortOrder: 2, restaurantId: restaurant.id }
	});
	const drinks = await prisma.section.create({
		data: { name: 'Drinks', sortOrder: 3, restaurantId: restaurant.id }
	});

	await prisma.dish.createMany({
		data: [
			{ sectionId: starters.id, name: 'Tomato Soup', description: 'With basil and cream', priceCents: 600, sortOrder: 1 },
			{ sectionId: starters.id, name: 'Bruschetta', description: 'Garlic, tomato, olive oil', priceCents: 700, sortOrder: 2 },
			{ sectionId: mains.id, name: 'Grilled Chicken', description: 'Herb butter, seasonal veg', priceCents: 1800, sortOrder: 1 },
			{ sectionId: mains.id, name: 'Pasta Alfredo', description: 'Creamy parmesan sauce', priceCents: 1500, sortOrder: 2 },
			{ sectionId: drinks.id, name: 'Lemonade', description: 'Fresh squeezed', priceCents: 500, sortOrder: 1 },
			{ sectionId: drinks.id, name: 'Iced Tea', description: 'Unsweetened', priceCents: 450, sortOrder: 2 }
		]
	});

	console.log('Seeded demo data.');
	console.log('Login with:');
	console.log('  Email: demo@qrmenu.local');
	console.log('  Password: demo1234');
	console.log('Public menu: /m/demo-bistro');
}

main()
	.catch(e => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});


