import { Controller, Post } from "@/utils/routeDecorators";
import path from "path";
import multer from "multer";
import COS from 'cos-nodejs-sdk-v5';
import { Request, Response, NextFunction } from 'express';

// ================= Local Upload Config =================
// This part is for the local file upload endpoint
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./assets/uploads/"); // Local save directory
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const localUpload = multer({
  storage: localStorage,
  limits: { fileSize: 1024 * 1024 * 300 }, // 300MB limit
});

// ================= COS Upload Config =================
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
const cosMid = (req: Request, res: Response, next: NextFunction) => {
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


@Controller("/upload")
export default class UploadController {

  /**
   * Handles file upload to Tencent Cloud COS.
   * The `cosMid` middleware must be executed before this handler. It processes
   * the file upload and attaches the final file details to the `req.file` object.
   */
  @Post("/cos", [cosMid])
  async uploadToCos(req: Request, res: Response) {
    if (!req.file) {
      // This is a fallback. The middleware should have already sent a response if no file was present.
      return res.status(400).send("File upload failed or file not found.");
    }

    // The middleware has done the heavy lifting. Now, we just return the details.
    res.json({
      message: "File uploaded to COS successfully",
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: (req.file as any).path, // Key in COS bucket
      url: (req.file as any).location, // Full URL to the object
    });
  }

  /**
   * Handles file upload to the local server's filesystem.
   * The `localUpload` middleware handles saving the file.
   */
  @Post("/file", [localUpload.single("file")])
  async upload(req: Request, res: Response) {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    // Return information about the locally saved file
    res.json({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path?.replace("\\\\", "/"),
    });
  }
}