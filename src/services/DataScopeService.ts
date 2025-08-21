import { Op } from 'sequelize';
import User from '../db/models/User';
import { DataScope } from '../db/models/DataScope';
import { logError } from '../logger';
import sequelize from '../db/sequelize';
import DynamicDataService from './DynamicDataService';
import CacheService from './CacheService';

const operatorMap = {
  equals: Op.eq,
  not: Op.ne,
  gt: Op.gt,
  gte: Op.gte,
  lt: Op.lt,
  lte: Op.lte,
  in: Op.in,
  notIn: Op.notIn,
  contains: Op.like,
  startsWith: Op.startsWith,
  endsWith: Op.endsWith,
};

class DataScopeService {
  private async parseRule(ruleBuilder: any, context: { tenantId: number, resource: string }): Promise<any> {
    if (!ruleBuilder || !ruleBuilder.conditions) return {};

    const parseGroup = async (group: any, currentResourceName: string): Promise<any> => {
      const conditionPromises = group.conditions.map((item: any) => {
        if (item.conditions) {
          return parseGroup(item, currentResourceName);
        }
        
        const { field, operator, value } = item;

        if (operator === 'exists') {
          return this.buildExistsCondition(field, value, context.tenantId, currentResourceName);
        }

        const sequelizeOp = operatorMap[operator];
        if (!sequelizeOp) {
          throw new Error(`Unsupported operator: ${operator}`);
        }
        
        let finalValue = value;
        if (operator === 'contains') {
          finalValue = `%${value}%`;
        }
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
   * Get the data scope where clause for a user and a specific resource.
   * @param user The user object.
   * @param resource The resource name (table name).
   * @returns A Sequelize where clause object.
   */
  public async getDataScopeWhere(userId: number, resource: string): Promise<any> {
    const cachedScope = CacheService.getDataScope(userId, resource);
    if (cachedScope) {
      return this.processRules(cachedScope, { currentUserId: userId });
    }

    let user = await User.findByPk(userId);
    try {
      const roles = await user.getRoles({
        include: [{
          model: DataScope,
          where: { resource },
          required: false,
        }],
      });

      if (!roles) {
        return {}; // No roles, no restrictions
      }

      const rulePromises = roles.flatMap(role => (role as any).DataScopes?.map(scope => {
        if (scope.ruleBuilder) {
          return this.parseRule(scope.ruleBuilder, { tenantId: user.tenantId, resource });
        }
        return Promise.resolve(scope.rule);
      }) || []);

      const rules = (await Promise.all(rulePromises)).filter(Boolean);

      if (rules.length === 0) {
        CacheService.setDataScope(userId, resource, {});
        return {}; // No rules for this resource, no restrictions
      }
      
      const existConditions = rules.filter(rule => rule.exist);
      const normalConditions = rules.filter(rule => !rule.exist);

      let whereClause: any = {};
      if (normalConditions.length > 0) {
        whereClause = {
          [Op.or]: normalConditions,
        };
      }
      
      if (existConditions.length > 0) {
        const mainTableDef = CacheService.getTableByAliasName(resource);
        const mainModelName = mainTableDef?.name || resource;
        whereClause = this.applyExistConditions(whereClause, existConditions, mainModelName);
      }
      
      CacheService.setDataScope(userId, resource, whereClause);
      return this.processRules(whereClause, { currentUserId: user.id });
    } catch (error) {
      logError(new Error(`Failed to get data scope for user ${user.id} and resource ${resource}: ${error.message}`));
      return {}; // Fail safe: no restrictions
    }
  }

  /**
   * Processes rules to replace runtime variables.
   * @param rules The rules to process.
   * @param variables The runtime variables to replace.
   * @returns The processed rules.
   */
  private processRules(rules: any, variables: { [key: string]: any }): any {
    if (Array.isArray(rules)) {
      return rules.map(item => this.processRules(item, variables));
    }

    // 仅处理“纯对象”，跳过 Sequelize 的实例（如 literal/col/fn/where）
    if (rules !== null && typeof rules === 'object') {
      const proto = Object.getPrototypeOf(rules);
      const isPlain = proto === Object.prototype || proto === null;
      if (!isPlain) {
        return rules;
      }
      const newObj: { [key: string | symbol]: any } = {};
      const keys = [...Object.keys(rules), ...Object.getOwnPropertySymbols(rules)];
      for (const key of keys) {
        newObj[key] = this.processRules((rules as any)[key], variables);
      }
      return newObj;
    }

    if (typeof rules === 'string') {
      const match = rules.match(/^\$\{(.+)\}$/);
      if (match && Object.prototype.hasOwnProperty.call(variables, match[1])) {
        return variables[match[1]];
      }
    }

    return rules;
  }

  /**
   * Applies exist-based subquery conditions.
   * @param where The original where clause.
   * @param existConditions The exist conditions to apply.
   * @param mainModelName The name of the main model being queried.
   * @returns The combined where clause.
   */
  private async buildExistsCondition(field: string, subRule: any, tenantId: number, mainTableName: string) {
    const mainTableDef = CacheService.getTableByAliasName(mainTableName);

    if (!mainTableDef) {
        throw new Error(`Table definition for ${mainTableName} not found.`);
    }

    const columnDef = mainTableDef.columns?.find(c => c.name === field);
    if (!columnDef || columnDef.dataType !== 'ID' || !columnDef.relatedToTableId) {
        throw new Error(`Field ${field} is not a valid relationship field or related table is not defined.`);
    }

    const relatedTableAlias = subRule.table;
    if (!relatedTableAlias) {
        throw new Error('Sub-rule for "exists" operator must specify a table.');
    }

    const relatedModel = await DynamicDataService.getModelForTable(relatedTableAlias, tenantId);
    const relatedTableDef = CacheService.getTableByName(relatedModel.tableName);

    if (!relatedTableDef) {
        throw new Error(`Related table definition for ${relatedTableAlias} not found.`);
    }
    
    const subWhere = await this.parseRule({ ...subRule, logic: subRule.logic || 'AND' }, { tenantId, resource: relatedTableDef.name });

    // 构建子条件 SQL（带别名）
    const as = `__exists_${relatedModel.tableName}`;
    const esc = (v: any) => sequelize.escape(v);
    const toSql = (cond: any): string => {
      if (!cond || typeof cond !== 'object') return '';
      const parts: string[] = [];
      const symbols = Object.getOwnPropertySymbols(cond);
      const keys = Object.keys(cond);

      // 处理逻辑运算符
      const andKey = symbols.find(s => s === Op.and);
      const orKey = symbols.find(s => s === Op.or);
      if (andKey) {
        const arr = cond[andKey] as any[];
        const sub = arr.map(toSql).filter(Boolean);
        return sub.length ? `(${sub.join(' AND ')})` : '';
      }
      if (orKey) {
        const arr = cond[orKey] as any[];
        const sub = arr.map(toSql).filter(Boolean);
        return sub.length ? `(${sub.join(' OR ')})` : '';
      }

      // 字段比较
      for (const field of keys) {
        const cmp = cond[field];
        if (cmp && typeof cmp === 'object') {
          const cmpSymbols = Object.getOwnPropertySymbols(cmp);
          for (const op of cmpSymbols) {
            const val = cmp[op];
            let sqlOp = '=';
            let sqlVal = '';
            if (op === Op.eq) { sqlOp = '='; sqlVal = esc(val); }
            else if (op === Op.ne) { sqlOp = '!='; sqlVal = esc(val); }
            else if (op === Op.gt) { sqlOp = '>'; sqlVal = esc(val); }
            else if (op === Op.gte) { sqlOp = '>='; sqlVal = esc(val); }
            else if (op === Op.lt) { sqlOp = '<'; sqlVal = esc(val); }
            else if (op === Op.lte) { sqlOp = '<='; sqlVal = esc(val); }
            else if (op === Op.like) { sqlOp = 'LIKE'; sqlVal = esc(val); }
            else if (op === Op.startsWith) { sqlOp = 'LIKE'; sqlVal = esc(String(val) + '%'); }
            else if (op === Op.endsWith) { sqlOp = 'LIKE'; sqlVal = esc('%' + String(val)); }
            else if (op === Op.in) {
              const list = Array.isArray(val) ? val : [val];
              sqlOp = 'IN';
              sqlVal = `(${list.map(esc).join(', ')})`;
            } else if (op === Op.notIn) {
              const list = Array.isArray(val) ? val : [val];
              sqlOp = 'NOT IN';
              sqlVal = `(${list.map(esc).join(', ')})`;
            } else {
              continue;
            }
            parts.push(`${as}.\`${field}\` ${sqlOp} ${sqlVal}`);
          }
        } else {
          parts.push(`${as}.\`${field}\` = ${esc(cmp)}`);
        }
      }
      return parts.length > 1 ? `(${parts.join(' AND ')})` : (parts[0] || '');
    };

    const subWhereSql = toSql(subWhere);
    const primaryKeyCol = relatedModel.primaryKeyAttribute;

    const joinCondition = `${as}.\`${primaryKeyCol}\` = \`${mainTableDef.name}\`.\`${field}\``;
    const whereClause = subWhereSql && subWhereSql.trim().length > 0
      ? `${joinCondition} AND (${subWhereSql})`
      : joinCondition;

    const subQuery = `
      SELECT 1 FROM \`${relatedModel.tableName}\` AS ${as}
      WHERE ${whereClause}
      LIMIT 1
    `;

    return sequelize.literal(`EXISTS (${subQuery})`);
  }

  private applyExistConditions(where: any, existConditions: any[], mainModelName: string): any {
    const subQueries = existConditions.map(condition => {
      const { model, as, from, to, whereSql } = condition.exist;
      const joinCondition = `${as}.\`${from}\` = \`${mainModelName}\`.\`${to}\``;
      const whereClause = whereSql && whereSql.trim().length > 0
        ? `${joinCondition} AND (${whereSql})`
        : joinCondition;
      const subQuery = `
        SELECT 1 FROM \`${model}\` AS ${as}
        WHERE ${whereClause}
        LIMIT 1
      `;
      return sequelize.literal(`EXISTS (${subQuery})`);
    });

    if (where[Op.or]) {
      where = {
        [Op.and]: [
          where,
          { [Op.or]: subQueries }
        ]
      };
    } else {
      where = {
        [Op.or]: subQueries
      };
    }

    return where;
  }
}

export default new DataScopeService();