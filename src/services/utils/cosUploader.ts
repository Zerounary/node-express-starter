import multer from "multer";
import COS from 'cos-nodejs-sdk-v5';
import { Request, Response, NextFunction } from 'express';
import path from "path";

// Configure COS SDK instance.
// IMPORTANT: Make sure to set TENCENT_COS_SECRET_ID, TENCENT_COS_SECRET_KEY, TENCENT_COS_BUCKET, and TENCENT_COS_REGION in your .env file.
const cos = new COS({
    SecretId: process.env.TENCENT_COS_SECRET_ID,
    SecretKey: process.env.TENCENT_COS_SECRET_KEY,
});

// Configure multer for COS to use memory storage, so we can get the file as a buffer
const cosUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 300 }, // 300MB limit
});

/**
 * Middleware to upload a file to Tencent Cloud COS.
 * It uses multer to parse the 'file' field from the multipart/form-data request
 * and then uploads the file buffer to the specified COS bucket.
 */
export const cosMid = (req: Request, res: Response, next: NextFunction) => {
    cosUpload.single("file")(req, res, (err: any) => {
        if (err) {
            // Handle multer-specific errors, e.g., file size limit exceeded
            return res.status(400).send(`File upload error: ${err.message}`);
        }
        if (!req.file) {
            return res.status(400).send("No file uploaded.");
        }

        // Generate a unique key (path/filename) for the object in the COS bucket
        const key = `uploads/${Date.now()}-${Math.round(
            Math.random() * 1e9
        )}${path.extname(req.file.originalname)}`;

        // Use the COS SDK's putObject method to upload the file from the buffer
        cos.putObject({
            Bucket: process.env.TENCENT_COS_BUCKET!,
            Region: process.env.TENCENT_COS_REGION!,
            Key: key,
            Body: req.file.buffer, // The file buffer from multer's memoryStorage
            onProgress: function(progressData) {
                // Optional: Log upload progress
                console.log('COS Upload Progress:', JSON.stringify(progressData));
            }
        }, (err, data) => {
            if (err) {
                console.error("COS upload failed:", err);
                return res.status(500).send("Failed to upload file to COS.");
            }
            
            // On successful upload, attach COS information to the req.file object
            // This makes it available in the next route handler (uploadToCos)
            req.file.filename = path.basename(key);
            // Add custom properties to the Express.Multer.File type
            // @ts-ignore
            req.file.path = key; // The object key in the COS bucket
            // @ts-ignore
            req.file.location = `https://${data.Location}`; // The full URL to the uploaded object

            next(); // Proceed to the next middleware/handler
        });
    });
};