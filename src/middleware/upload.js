import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

export const upload = multer({
	storage: multer.diskStorage({
		destination: function (req, file, cb) { cb(null, uploadsDir); },
		filename: function (req, file, cb) {
			const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
			const ext = path.extname(file.originalname) || '.jpg';
			cb(null, unique + ext);
		}
	}),
	limits: { fileSize: 5 * 1024 * 1024 }
});


