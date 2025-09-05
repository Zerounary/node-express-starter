import { Model, ModelCtor, DataTypes } from 'sequelize';
import sequelize from '../db/sequelize';
import { DynamicTable, DynamicColumn } from '../db/models';
import { logError } from '../logger';
import { ColumnDataTypes } from '@/utils';
import CacheService from './CacheService';
import { getPhysicalTableName } from './utils/dynamic';

class DynamicDataService {
  private modelCache: Map<string, ModelCtor<Model<any, any>>> = new Map();
  private relationsCache: Map<string, boolean> = new Map();

  private async getPhysicalTableName(tableName: string, tenantId: number): Promise<string> {
    return await getPhysicalTableName(tableName, tenantId);
  }

  private getSequelizeAttributes(columns: DynamicColumn[]) {
    const attributes: { [key: string]: any } = {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
    };

    for (const column of columns) {
      if (column.name === 'id') continue;
      if (column.dataType === 'RELATIONSHIP') {
        attributes[column.name] = { type: DataTypes.INTEGER, allowNull: true };
      } else if (column.dataType === 'ENUM') {
        // attributes[column.name] = { type: DataTypes.ENUM(...(column.enumValues || [])), allowNull: true };
      } else {
        attributes[column.name] = { type: this.mapDataType(column.dataType), allowNull: true };
      }
    }
    return attributes;
  }

  /**
   * Maps a string data type to Sequelize DataTypes.
   * @param dataType Maps a string data type to Sequelize DataTypes.
   * @returns 
   */
  private mapDataType(dataType: string) {
    switch (dataType.toUpperCase()) {
      case ColumnDataTypes.ID: return DataTypes.INTEGER;
      case ColumnDataTypes.DOCNO: return DataTypes.STRING;
      case ColumnDataTypes.DATENUMBER: return DataTypes.INTEGER;
      case ColumnDataTypes.QTY: return DataTypes.INTEGER;
      case ColumnDataTypes.AMT: return DataTypes.DECIMAL;
      default: 
        let defaultType = DataTypes[ColumnDataTypes[dataType.toUpperCase()]];
        if (!defaultType) {
          throw new Error(`Unsupported data type: ${dataType}`);
        } else {
          return defaultType;
        }
    }
  }

  public async defineRelationships(model: ModelCtor<Model>, tableDefinition: DynamicTable, tenantId: number) {
    const physicalTableName = await this.getPhysicalTableName(tableDefinition.name, tenantId);
    if (this.relationsCache.has(physicalTableName)) return;

    for (const column of tableDefinition.columns!) {
        try {
            if (column.dataType === 'RELATIONSHIP' && column.relatedToTableId) {
                const relatedTableDef = await CacheService.getTableById(column.relatedToTableId);
                if (relatedTableDef) {
                    const RelatedModel = await this.getModelForTable(relatedTableDef.name, tenantId);
                    model.belongsTo(RelatedModel, { foreignKey: column.name, as: column.name.replace(/Id$/, '') });
                }
            }
        } catch (e) {
            logError(e);
        }
    }
    this.relationsCache.set(physicalTableName, true);
  }

  public async getModelForTable(tableName: string, tenantId: number): Promise<ModelCtor<Model<any, any>>> {
    const physicalTableName = await this.getPhysicalTableName(tableName, tenantId);
    const cacheKey = physicalTableName;
    if (this.modelCache.has(cacheKey)) {
        const model = this.modelCache.get(cacheKey)!;
        const tableDef = await CacheService.getTableByName(physicalTableName);
        if (tableDef) {
            await this.defineRelationships(model, tableDef, tenantId);
        }
        return model;
    }

    let tableDefinition = await CacheService.getTableByName(physicalTableName);

    if (!tableDefinition) {
      // Fallback to database if not in cache, and then reload the cache for this table
      const dbTableDef = await DynamicTable.findOne({
          where: { name: physicalTableName },
          include: [{ model: DynamicColumn, as: 'columns' }],
      });
      if (dbTableDef) {
          await CacheService.reloadTable(physicalTableName);
          tableDefinition = await CacheService.getTableByName(physicalTableName);
      }
    }

    if (!tableDefinition) {
        throw new Error(`Table '${physicalTableName}' not found for the current tenant.`);
    }

    const attributes = this.getSequelizeAttributes(tableDefinition.columns!);
    attributes.tenantId = { type: DataTypes.INTEGER, allowNull: false };
    
    const Model = sequelize.define(physicalTableName, attributes, { tableName: physicalTableName, timestamps: false });
    this.modelCache.set(cacheKey, Model);
    
    await this.defineRelationships(Model, tableDefinition, tenantId);

    return Model;
  }

  resetModelCache(key: string) {
    this.modelCache.delete(key);
  }
}

export default new DynamicDataService(); 