import { Controller, Get, Post, Put, Delete } from "@/utils/routeDecorators";
import { fail, ok } from "@/router/api";
import Region from "@/db/models/Region";
import { Op } from "sequelize";

const validateAndParseInt = (value: any, fieldName: string) => {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new Error(`Invalid ${fieldName}: must be an integer.`);
    }
    return parsed;
};

@Controller("/regions")
export default class RegionController {

  @Get("/provinces")
  async getProvinces(req, res) {
    try {
      const { tenantId } = req.user;
      const provinces = await Region.findAll({
        where: { 
          tenantId,
          level: 1 
        },
        order: [['code', 'ASC']],
      });
      return ok(provinces);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Get("/cities/:provinceCode")
  async getCities(req, res) {
    try {
      const { provinceCode } = req.params;
      const { tenantId } = req.user;
      
      const cities = await Region.findAll({
        where: { 
          tenantId,
          level: 2,
          parentCode: provinceCode
        },
        order: [['code', 'ASC']],
      });
      return ok(cities);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Get("/districts/:cityCode")
  async getDistricts(req, res) {
    try {
      const { cityCode } = req.params;
      const { tenantId } = req.user;
      
      const districts = await Region.findAll({
        where: { 
          tenantId,
          level: 3,
          parentCode: cityCode
        },
        order: [['code', 'ASC']],
      });
      return ok(districts);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Get("/tree")
  async getRegionTree(req, res) {
    try {
      const { tenantId } = req.user;
      
      // 获取所有省份
      const provinces = await Region.findAll({
        where: { 
          tenantId,
          level: 1 
        },
        order: [['code', 'ASC']],
      });

      // 构建树形结构
      const tree = [];
      for (const province of provinces) {
        const cities = await Region.findAll({
          where: { 
            tenantId,
            level: 2,
            parentCode: province.code
          },
          order: [['code', 'ASC']],
        });

        const provinceNode = {
          ...province.toJSON(),
          children: []
        };

        for (const city of cities) {
          const districts = await Region.findAll({
            where: { 
              tenantId,
              level: 3,
              parentCode: city.code
            },
            order: [['code', 'ASC']],
          });

          const cityNode = {
            ...city.toJSON(),
            children: districts.map(d => d.toJSON())
          };

          provinceNode.children.push(cityNode);
        }

        tree.push(provinceNode);
      }

      return ok(tree);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Get("/search")
  async searchRegions(req, res) {
    try {
      const { tenantId } = req.user;
      const { keyword, level } = req.query;
      
      const where: any = { tenantId };
      
      if (keyword) {
        where.name = { [Op.like]: `%${keyword}%` };
      }
      
      if (level) {
        where.level = parseInt(level as string, 10);
      }

      const regions = await Region.findAll({
        where,
        order: [['level', 'ASC'], ['code', 'ASC']],
        limit: 100
      });

      return ok(regions);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Post("/")
  async createRegion(req, res) {
    const body = await req.json();
    const { code, name, level, parentCode } = body;
    const { tenantId } = req.user;
    
    if (!code || !name || !level) {
      return fail("Code, name and level are required.", 400);
    }

    try {
      let parentId = null;
      if (parentCode) {
        const parent = await Region.findOne({
          where: { code: parentCode, tenantId }
        });
        if (parent) {
          parentId = parent.id;
        }
      }

      const region = await Region.create({ 
        code, 
        name, 
        level, 
        parentCode, 
        parentId,
        tenantId 
      });
      return ok(region);
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }

  @Put("/:id")
  async updateRegion(req, res) {
    const { id } = req.params;
    const body = await req.json();
    const { name, parentCode } = body;
    const { tenantId } = req.user;
    
    try {
      const regionId = validateAndParseInt(id, 'region ID');
      const region = await Region.findOne({ where: { id: regionId, tenantId } });
      
      if (!region) {
        return fail("Region not found.", 404);
      }

      let parentId = region.parentId;
      if (parentCode !== undefined) {
        if (parentCode) {
          const parent = await Region.findOne({
            where: { code: parentCode, tenantId }
          });
          parentId = parent ? parent.id : null;
        } else {
          parentId = null;
        }
      }

      await region.update({ name, parentCode, parentId });
      return ok(region);
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Delete("/:id")
  async deleteRegion(req, res) {
    const { id } = req.params;
    const { tenantId } = req.user;
    
    try {
      const regionId = validateAndParseInt(id, 'region ID');
      
      // 检查是否有子区域
      const childCount = await Region.count({
        where: { parentId: regionId, tenantId }
      });
      
      if (childCount > 0) {
        return fail("Cannot delete region with child regions.", 400);
      }

      const result = await Region.destroy({ where: { id: regionId, tenantId } });
      if (result === 0) {
        return fail("Region not found.", 404);
      }
      
      return ok({ message: "Region deleted successfully." });
    } catch (error: any) {
      return fail(error.message, error.message.startsWith('Invalid') ? 400 : 500);
    }
  }

  @Post("/batch-import")
  async batchImportRegions(req, res) {
    const body = await req.json();
    const { regions } = body;
    const { tenantId } = req.user;
    
    if (!Array.isArray(regions) || regions.length === 0) {
      return fail("Regions must be a non-empty array.", 400);
    }

    try {
      const regionsWithTenant = regions.map(region => ({
        ...region,
        tenantId
      }));

      const createdRegions = await Region.bulkCreate(regionsWithTenant, {
        ignoreDuplicates: true
      });

      return ok({ 
        message: `Successfully imported ${createdRegions.length} regions.`,
        count: createdRegions.length
      });
    } catch (error: any) {
      return fail(error.message, 500);
    }
  }
}