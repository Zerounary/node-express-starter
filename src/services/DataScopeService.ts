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
        return {}; // No rules for this resource, no restrictions
      }

      // Replace runtime variables like ${currentUserId}
      const processedRules = this.processRules(rules, { currentUserId: user.id });
      
      const existConditions = processedRules.filter(rule => rule.exist);
      const normalConditions = processedRules.filter(rule => !rule.exist);

      let whereClause: any = {};
      if (normalConditions.length > 0) {
        whereClause = {
          [Op.or]: normalConditions,
        };
      }
      
      if (existConditions.length > 0) {
        return this.applyExistConditions(whereClause, existConditions, resource);
      }

      return whereClause;
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

    if (typeof rules === 'object' && rules !== null) {
      const newObj: { [key: string | symbol]: any } = {};
      const keys = [...Object.keys(rules), ...Object.getOwnPropertySymbols(rules)];
      for (const key of keys) {
        newObj[key] = this.processRules(rules[key], variables);
      }
      return newObj;
    }

    if (typeof rules === 'string') {
      const match = rules.match(/^\$\{(.+)\}$/);
      if (match && variables.hasOwnProperty(match[1])) {
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

    const primaryKeyCol = relatedModel.primaryKeyAttribute;
    const relatedInstances = await relatedModel.findAll({
        where: subWhere,
        attributes: [primaryKeyCol],
        raw: true,
    });

    const relatedIds = relatedInstances.map(i => i[primaryKeyCol]);

    return { [field]: { [Op.in]: relatedIds } };
  }

  private applyExistConditions(where: any, existConditions: any[], mainModelName: string): any {
    const subQueries = existConditions.map(condition => {
      const { model, as, from, to, where: subWhere } = condition.exist;
      // Note: `to` should reference a field in the main model.
      const subQuery = `
        SELECT 1 FROM ${model} AS ${as}
        WHERE ${as}.${from} = \`${mainModelName}\`.\`${to}\`)
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