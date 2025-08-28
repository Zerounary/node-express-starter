import { Controller, Post } from "@/utils/routeDecorators";
import { Request, Response } from 'express';
import { cosMid } from "@/services/utils/cosUploader";
import { localUploadMiddleware } from "@/services/utils/localUploader";
import { fail, ok } from "@/router/api";

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
      return fail("No file uploaded", 400)
    }

    return ok({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: (req.file as any).path, 
      url: (req.file as any).location,
    })
  }

  /**
   * Handles file upload to the local server's filesystem.
   * The `localUpload` middleware handles saving the file.
   */
  @Post("/file", [localUploadMiddleware])
  async upload(req: Request, res: Response) {
    if (!req.file) {
      return fail("No file uploaded", 400)
    }

    // Return information about the locally saved file
    return ok({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path?.replace(/\\/g, "/"),
    })
  }
}