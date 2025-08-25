import { Op } from 'sequelize';
import User from '../db/models/User';
import { DataScope } from '../db/models/DataScope';
import { logError } from '../logger';
import sequelize from '../db/sequelize';
import DynamicDataService from './DynamicDataService';
import CacheService from './CacheService';

// 抽取的工具方法与映射
import { operatorMap, normalizeValueForOperator } from './utils/sequelize-operators';
import { processRules } from './utils/rule-processor';
import { whereObjectToSql } from './utils/sql-where-builder';

class DataScopeService {
  /**
   * 解析前端规则构建器（ruleBuilder）为 Sequelize where 片段
   * 支持嵌套 AND/OR 组；支持 exists 操作符（生成 EXISTS 子查询 literal）
   */
  private async parseRule(
    ruleBuilder: any,
    context: { tenantId: number; resource: string }
  ): Promise<any> {
    if (!ruleBuilder || !ruleBuilder.conditions) return {};

    const parseGroup = async (group: any, currentResourceName: string): Promise<any> => {
      const conditionPromises = group.conditions.map((item: any) => {
        // 子组
        if (item.conditions) {
          return parseGroup(item, currentResourceName);
        }

        const { field, operator, value } = item;

        // 关系存在判断：构造 EXISTS 子查询（返回 sequelize.literal）
        if (operator === 'exists') {
          return this.buildExistsCondition(field, value, context.tenantId, currentResourceName);
        }

        // 普通比较操作
        const sequelizeOp = (operatorMap as any)[operator];
        if (!sequelizeOp) {
          throw new Error(`Unsupported operator: ${operator}`);
        }

        const finalValue = normalizeValueForOperator(operator, value);
        return Promise.resolve({ [field]: { [sequelizeOp]: finalValue } });
      });

      const conditions = (await Promise.all(conditionPromises)).filter(Boolean);

      if (conditions.length === 0) {
        return null;
      }

      return {
        [group.logic === 'AND' ? Op.and : Op.or]: conditions,
      };
    };

    return parseGroup(ruleBuilder, context.resource);
  }

  /**
   * Computes the data scope where clause directly from the database.
   * This method is intended for use by the CacheService when the cache is disabled,
   * or for cache warming.
   * @param userId The ID of the user.
   * @param resource The resource name (table alias).
   * @returns A promise that resolves to the Sequelize where clause.
   */
  public async computeDataScope(userId: number, resource: string): Promise<any> {
    const user = await User.findByPk(userId);
    if (!user) {
      logError(new Error(`User not found for data scope computation: ${userId}`));
      return {}; // No user, no permissions.
    }

    try {
      const roles = await (user as any).getRoles({
        include: [
          {
            model: DataScope,
            where: { resource },
            required: false,
          },
        ],
      });

      if (!roles || roles.length === 0) {
        return {}; // No roles with relevant data scopes, no restrictions.
      }

      const rulePromises =
        roles.flatMap((role: any) => {
          const scopes: any[] = role?.DataScopes || [];
          return scopes.map((scope) => {
            if (scope.ruleBuilder) {
              return this.parseRule(scope.ruleBuilder, { tenantId: (user as any).tenantId, resource });
            }
            return Promise.resolve(scope.rule);
          });
        }) || [];

      const rules = (await Promise.all(rulePromises)).filter(Boolean);

      if (rules.length === 0) {
        return {}; // No rules found for this resource.
      }

      const existConditions = rules.filter((rule: any) => rule?.exist);
      const normalConditions = rules.filter((rule: any) => !rule?.exist);

      let whereClause: any = {};
      if (normalConditions.length > 0) {
        whereClause = { [Op.or]: normalConditions };
      }

      if (existConditions.length > 0) {
        const mainTableDef = await CacheService.getTableByAliasName(resource);
        const mainModelName = mainTableDef?.name || resource;
        whereClause = this.applyExistConditions(whereClause, existConditions, mainModelName);
      }

      return whereClause;
    } catch (error: any) {
      logError(new Error(`Failed to compute data scope for user ${userId} and resource ${resource}: ${error.message}`));
      return {}; // Fallback: no restrictions on failure.
    }
  }

  /**
   * Retrieves the data scope where clause for a user and resource, using cache if available.
   * If the cache is disabled or the scope is not cached, it computes the scope from the DB.
   * @param userId The ID of the user.
   * @param resource The resource name (table alias).
   * @returns A promise that resolves to the processed Sequelize where clause.
   */
  public async getDataScopeWhere(userId: number, resource: string): Promise<any> {
    const user = await User.findByPk(userId);
    if (!user) return {};

    // getDataScope will fetch from DB if cache is disabled.
    const cachedScope = await CacheService.getDataScope(userId, resource);
    if (cachedScope) {
      return processRules(cachedScope, { currentUserId: userId });
    }

    // If we are here, it means cache is enabled, but this scope is not cached.
    // So, we compute it, cache it, and return it.
    const whereClause = await this.computeDataScope(userId, resource);

    CacheService.setDataScope(userId, resource, whereClause);
    return processRules(whereClause, { currentUserId: (user as any).id });
  }

  /**
   * 构造 EXISTS 子查询（面向 ruleBuilder 的 exists 操作符）
   * 返回 sequelize.literal，以便可直接放入 where 数组中
   */
  private async buildExistsCondition(field: string, subRule: any, tenantId: number, mainTableName: string) {
    const mainTableDef = await CacheService.getTableByAliasName(mainTableName);
    if (!mainTableDef) {
      throw new Error(`Table definition for ${mainTableName} not found.`);
    }

    // 校验主表字段为关系字段
    const columnDef = mainTableDef.columns?.find((c: any) => c.name === field);
    if (!columnDef || columnDef.dataType !== 'ID' || !columnDef.relatedToTableId) {
      throw new Error(`Field ${field} is not a valid relationship field or related table is not defined.`);
    }

    // 关联的目标表（通过别名）
    const relatedTableAlias = subRule.table;
    if (!relatedTableAlias) {
      throw new Error('Sub-rule for "exists" operator must specify a table.');
    }

    const relatedModel = await DynamicDataService.getModelForTable(relatedTableAlias, tenantId);
    const relatedTableDef = await CacheService.getTableByName((relatedModel as any).tableName);
    if (!relatedTableDef) {
      throw new Error(`Related table definition for ${relatedTableAlias} not found.`);
    }

    // 子条件 where（仍然按资源别名解析）
    const subWhere = await this.parseRule(
      { ...subRule, logic: subRule.logic || 'AND' },
      { tenantId, resource: relatedTableDef.name }
    );

    // 生成 SQL 片段
    const as = `__exists_${(relatedModel as any).tableName}`;
    const esc = (v: any) => sequelize.escape(v);
    const subWhereSql = whereObjectToSql(subWhere, as, esc);

    const primaryKeyCol = (relatedModel as any).primaryKeyAttribute;
    const joinCondition = `${as}.\`${primaryKeyCol}\` = \`${mainTableDef.name}\`.\`${field}\``;
    const whereClause =
      subWhereSql && subWhereSql.trim().length > 0 ? `${joinCondition} AND (${subWhereSql})` : joinCondition;

    const subQuery = `
      SELECT 1 FROM \`${(relatedModel as any).tableName}\` AS ${as}
      WHERE ${whereClause}
      LIMIT 1
    `;

    return sequelize.literal(`EXISTS (${subQuery})`);
  }

  /**
   * 应用 existConditions（来源于 scope.rule.exist 的结构化定义）
   * 将多个 EXISTS 子查询以 OR 合并，并与原 where 以 AND 拼接
   */
  private applyExistConditions(where: any, existConditions: any[], mainModelName: string): any {
    const subQueries = existConditions.map((condition: any) => {
      const { model, as, from, to, whereSql } = condition.exist;
      const joinCondition = `${as}.\`${from}\` = \`${mainModelName}\`.\`${to}\``;
      const clause = whereSql && whereSql.trim().length > 0 ? `${joinCondition} AND (${whereSql})` : joinCondition;
      const subQuery = `
        SELECT 1 FROM \`${model}\` AS ${as}
        WHERE ${clause}
        LIMIT 1
      `;
      return sequelize.literal(`EXISTS (${subQuery})`);
    });

    if (where[Op.or]) {
      where = {
        [Op.and]: [where, { [Op.or]: subQueries }],
      };
    } else {
      where = {
        [Op.or]: subQueries,
      };
    }

    return where;
  }
}

export default new DataScopeService();