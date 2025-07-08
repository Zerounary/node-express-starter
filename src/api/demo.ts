import Demo from "@/db/models/demo";
import { fail, ok } from "@/router/api";
import { Controller, Get, Post } from "@/utils/routeDecorators";
import ActionLog from "@/db/models/ActionLog";
import { Transaction } from "sequelize";
import sequelize from "@/db/sequelize";

@Controller("/demo")
export default class demo {

  @Get("/test")
  async test(req, res) {
    return ok("ok")
  }

  @Get("/echo")
  async echo(req, res) {
    return ok("echo test success");
  }

  @Get("/actionlog/:id")
  async getActionLogById(req, res) {
    const { id } = req.params;
    const log = await ActionLog.findByPk(id);
    if (!log) {
      return fail("ActionLog not found");
    }
    return ok(log);
  }

  @Get("/actionlog/list")
  async getActionLogList(req, res) {
    const { page = 1, pageSize = 10 } = req.query;
    const limit = parseInt(pageSize);
    const offset = (parseInt(page) - 1) * limit;
    const { count, rows } = await ActionLog.findAndCountAll({
      limit,
      offset,
      // order: [['createdAt', 'DESC']],
    });
    return ok({
      total: count,
      list: rows,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    });
  }

  @Post("/actionlog/add")
  async addActionLog(req, res) {
    const body = await req.json();
    const {
      userId,
      action,
      method,
      path,
      params,
      data,
      ip
    } = body;

    if (!action || !method || !path) {
      return fail("action, method, and path are required");
    }

    const log = await ActionLog.create({
      userId,
      action,
      method,
      path,
      params: params || {},
      body: data || {},
      ip,
    });
    return ok(log);
  }

  @Post("/actionlog/update/:id")
  async updateActionLog(req, res) {
    const { id } = req.params;
    const body = await req.json();
    const {
      userId,
      action,
      method,
      path,
      params,
      data,
      ip
    } = body;

    const log = await ActionLog.findByPk(id);
    if (!log) {
      return fail("ActionLog not found");
    }

    await log.update({
      userId,
      action,
      method,
      path,
      params: params || {},
      body: data || {},
      ip,
    });
    return ok(log);
  }

  @Post("/actionlog/delete/:id")
  async deleteActionLog(req, res) {
    const { id } = req.params;
    const log = await ActionLog.findByPk(id);
    if (!log) {
      return fail("ActionLog not found");
    }
    await log.destroy();
    return ok("ActionLog deleted successfully");
  }

  @Post("/actionlog/transaction/:id")
  async transactionActionLog(req, res) {
    const { id } = req.params;
    let transaction: Transaction | undefined;
    try {
      transaction = await sequelize.transaction();
      const currentLog = await ActionLog.findByPk(id, { transaction });
      if (!currentLog) {
        await transaction.rollback();
        return fail("Current ActionLog not found");
      }

      const targetId = parseInt(id) - 1;
      const targetLog = await ActionLog.findByPk(targetId, { transaction });

      if (targetLog) {
        await targetLog.update({
          action: `updated via transaction from ${currentLog.id}`,
          method: 'POST',
        }, { transaction });
      } else {
        console.log(`ActionLog with ID ${targetId} not found, skipping update.`);
      }

      await transaction.commit();
      return ok("Transaction completed successfully");
    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      console.error('Transaction failed:', error);
      return fail("Transaction failed");
    }
  }

  @Get("/list")
  async list12(req, res) {
    let list = await Demo.findAll();
    return ok(list)
  }


  @Post("/add")
  async add(req,res) {
    let body = await req.json();
    if(body.name === undefined || body.name === '') {
        return fail('name is required');
    }
    let user = await Demo.create({
      name: body.name,
    })
    console.log('🚀 ~ api.post ~ user:', user)
    return ok(user);
  }
}
