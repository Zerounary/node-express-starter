import { Controller, Post } from "@/utils/routeDecorators";
import path from "path";
import multer from "multer";

// 配置存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./assets/uploads/"); // 保存目录
  },
  filename: (req, file, cb) => {
    // 生成唯一文件名：时间戳+随机数+扩展名
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 创建上传实例
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 300, }, // 限制300MB
});


@Controller("/upload")
export default class UploadController {

  @Post("/file", [upload.single("file")])
  async upload(req, res) {
    if (!req.file) {
      return res.status(400).send("No file uploaded");
    }

    // 返回文件信息
    res.json({
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      path: req.file.path?.replaceAll("\\", "/"),
    });
  }
}