import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
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
  async getCategories(req, res) {
    try {
      const { tenantId } = req.user;
      const categories = await MediaCategory.findAll({
        where: { tenantId },
        order: [['createdAt', 'ASC']],
      });
      return ok(categories);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Post("/categories")
  async createCategory(req, res) {
    const body = await req.json();
    const { name, parentId } = body;
    const { tenantId } = req.user;
    if (!name) {
      return fail("Category name is required.", 400);
    }
    try {
      const category = await MediaCategory.create({ name, parentId, tenantId });
      return ok(category);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Put("/categories/:id")
  async updateCategory(req, res) {
    const { id } = req.params;
    const body = await req.json();
    const { name, parentId } = body;
    const { tenantId } = req.user;
    try {
      const categoryId = validateAndParseInt(id, 'category ID');
      const category = await MediaCategory.findOne({ where: { id: categoryId, tenantId } });
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
  async deleteCategory(req, res) {
    const { id } = req.params;
    const { tenantId } = req.user;
    try {
      const categoryId = validateAndParseInt(id, 'category ID');
      const result = await MediaCategory.destroy({ where: { id: categoryId, tenantId } });
      if (result === 0) {
        return fail("Category not found.", 404);
      }
      return ok({ message: "Category deleted successfully." });
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Get("/page")
  async getMedia(req, res) {
    try {
        const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
        const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : 24;
        const query = req.query.query as string;
        const types = req.query.types as string[];
        const sort = req.query.sort as string || 'createdAtDesc';
        const categoryId = req.query.categoryId as string;

        const offset = (page - 1) * pageSize;

        const where: any = { tenantId: req.user.tenantId };
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

  @Post("/upload",[cosMid])
  async createMedia(req, res) {
    if (!req.file) {
      return fail("No file uploaded", 400);
    }
    const { originalname, size, mimetype } = req.file;
    const { location: url, key: name } = req.file as any;
    const { categoryId, filename } = req.body;

    const type = mimetype.startsWith('image/') ? 'image' : (mimetype.startsWith('video/') ? 'video' : undefined);
    if (!type) {
        return fail("Unsupported file type", 400);
    }

    try {
      const media = await Media.create({
        name: filename || name || originalname,
        url,
        size,
        type,
        categoryId: categoryId ? parseInt(categoryId, 10) : null,
        tenantId: req.user.tenantId,
      });
      return ok(media);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Put("/:id")
  async updateMedia(req, res) {
    const { id } = req.params;
    const body = await req.json();
    const { name, tags, categoryId } = body;
    const { tenantId } = req.user;
    try {
      const mediaId = validateAndParseInt(id, 'media ID');
      const media = await Media.findOne({ where: { id: mediaId, tenantId } });
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
  async deleteMedia(req, res) {
    const { id } = req.params;
    const { tenantId } = req.user;
    try {
      const mediaId = validateAndParseInt(id, 'media ID');
      const result = await Media.destroy({ where: { id: mediaId, tenantId } });
      if (result === 0) {
        return fail("Media not found.", 404);
      }
      return ok({ message: "Media deleted successfully." });
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Post("/batch-delete")
  async batchDeleteMedia(req, res) {
    const body = await req.json();
    const { ids } = body;
    const { tenantId } = req.user;
    if (!Array.isArray(ids) || ids.length === 0) {
      return fail("IDs must be a non-empty array.", 400);
    }
    try {
      const count = await Media.destroy({ where: { id: { [Op.in]: ids }, tenantId } });
      return ok({ message: `Successfully deleted ${count} media items.` });
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }
}