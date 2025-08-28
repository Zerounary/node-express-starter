import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = "./assets/uploads/";

// Ensure the upload directory exists
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req: any, file, cb) {
    const { tenantId, id: userId } = req.user || {};

    let finalUploadDir = uploadDir;
    if (tenantId && userId) {
        finalUploadDir = path.join(uploadDir, `t_${tenantId}`, `u_${userId}`);
    }
    
    // Ensure the directory exists
    fs.mkdirSync(finalUploadDir, { recursive: true });

    cb(null, finalUploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 300 }, // 300MB limit
});

export const localUploadMiddleware = upload.single("file");