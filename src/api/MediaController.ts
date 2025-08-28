import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { Request, Response } from 'express';
import { fail, ok } from "@/router/api";
import Media from "@/db/models/Media";
import MediaCategory from "@/db/models/MediaCategory";
import { Op } from "sequelize";
import { cosMid } from "@/services/utils/cosUploader";

const validateAndParseInt = (value: any, fieldName: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid ${fieldName}: must be an integer.`);
    }
    return parsed;
};

@Controller("/media")
export default class MediaController {

  @Get("/categories")
  async getCategories(req: Request, res: Response) {
    try {
      const categories = await MediaCategory.findAll({
        order: [['createdAt', 'ASC']],
      });
      return ok(categories);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Post("/categories")
  async createCategory(req: Request, res: Response) {
    const { name, parentId } = req.body;
    if (!name) {
      return fail("Category name is required.", 400);
    }
    try {
      const category = await MediaCategory.create({ name, parentId });
      return ok(category);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Put("/categories/:id")
  async updateCategory(req: Request, res: Response) {
    const { id } = req.params;
    const { name, parentId } = req.body;
    try {
      const categoryId = validateAndParseInt(id, 'category ID');
      const category = await MediaCategory.findByPk(categoryId);
      if (!category) {
        return fail("Category not found.", 404);
      }
      await category.update({ name, parentId });
      return ok(category);
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Delete("/categories/:id")
  async deleteCategory(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const categoryId = validateAndParseInt(id, 'category ID');
      const result = await MediaCategory.destroy({ where: { id: categoryId } });
      if (result === 0) {
        return fail("Category not found.", 404);
      }
      return ok({ message: "Category deleted successfully." });
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Get("/")
  async getMedia(req: Request, res: Response) {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 24;
        const query = req.query.query as string;
        const types = req.query.types as string[];
        const sort = req.query.sort as string || 'createdAtDesc';
        const categoryId = req.query.categoryId as string;

        const offset = (page - 1) * pageSize;

        const where: any = {};
        if (query) {
            where.name = { [Op.like]: `%${query}%` };
        }
        if (types && types.length > 0) {
            where.type = { [Op.in]: types };
        }
        if (categoryId && categoryId !== 'all') {
            where.categoryId = categoryId;
        }

        const orderMap: {[key: string]: [string, string]} = {
            'createdAtDesc': ['createdAt', 'DESC'],
            'createdAtAsc': ['createdAt', 'ASC'],
            'sizeDesc': ['size', 'DESC'],
            'sizeAsc': ['size', 'ASC'],
            'nameAsc': ['name', 'ASC'],
            'nameDesc': ['name', 'DESC'],
        };
        const order = orderMap[sort] || ['createdAt', 'DESC'];

        const { count, rows } = await Media.findAndCountAll({
            where,
            order: [order],
            limit: pageSize,
            offset,
        });

        return ok({ items: rows, total: count });
    } catch (error: any) {
        return fail(error.message, 500);
    }
  }

  @Post("/",[cosMid])
  async createMedia(req: Request, res: Response) {
    if (!req.file) {
      return fail("No file uploaded", 400);
    }
    const { originalname, size, mimetype } = req.file;
    const { location: url, key: name } = req.file as any;

    const type = mimetype.startsWith('image/') ? 'image' : (mimetype.startsWith('video/') ? 'video' : undefined);
    if (!type) {
        return fail("Unsupported file type", 400);
    }

    try {
      const media = await Media.create({
        name: name || originalname,
        url,
        size,
        type,
      });
      return ok(media);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Put("/:id")
  async updateMedia(req: Request, res: Response) {
    const { id } = req.params;
    const { name, tags, categoryId } = req.body;
    try {
      const mediaId = validateAndParseInt(id, 'media ID');
      const media = await Media.findByPk(mediaId);
      if (!media) {
        return fail("Media not found.", 404);
      }
      await media.update({ name, tags, categoryId });
      return ok(media);
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Delete("/:id")
  async deleteMedia(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const mediaId = validateAndParseInt(id, 'media ID');
      const result = await Media.destroy({ where: { id: mediaId } });
      if (result === 0) {
        return fail("Media not found.", 404);
      }
      return ok({ message: "Media deleted successfully." });
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Post("/batch-delete")
  async batchDeleteMedia(req: Request, res: Response) {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return fail("IDs must be a non-empty array.", 400);
    }
    try {
      const count = await Media.destroy({ where: { id: { [Op.in]: ids } } });
      return ok({ message: `Successfully deleted ${count} media items.` });
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }
}