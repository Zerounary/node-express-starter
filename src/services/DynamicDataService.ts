import { Model, ModelCtor, DataTypes } from 'sequelize';
import sequelize from '../db/sequelize';
import { DynamicTable, DynamicColumn } from '../db/models';
import { logError } from '../logger';
import { systemTables } from '@/db/init';
import { ColumnDataTypes } from '@/utils';

class DynamicDataService {
  private modelCache: Map<string, ModelCtor<Model<any, any>>> = new Map();
  private relationsCache: Map<string, boolean> = new Map();

  private getPhysicalTableName(tableName: string, tenantId: number): string {
    let t = systemTables.find(t => t.alias_name === tableName);
    return t ? t.name : tableName;
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
        attributes[column.name] = { type: DataTypes.ENUM(...(column.enumValues || [])), allowNull: true };
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
    const physicalTableName = this.getPhysicalTableName(tableDefinition.name, tenantId);
    if (this.relationsCache.has(physicalTableName)) return;

    for (const column of tableDefinition.columns!) {
        try {
            if (column.dataType === 'RELATIONSHIP' && column.relatedToTableId) {
                const relatedTableDef = await DynamicTable.findByPk(column.relatedToTableId);
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
    const physicalTableName = this.getPhysicalTableName(tableName, tenantId);
    const cacheKey = physicalTableName;
    if (this.modelCache.has(cacheKey)) {
        const model = this.modelCache.get(cacheKey)!;
        // Ensure relationships are defined, even if model is from cache
        const tableDef = await DynamicTable.findOne({where: {name: physicalTableName, }, include: [{ model: DynamicColumn, as: 'columns' }]})
        if (tableDef) {
            await this.defineRelationships(model, tableDef as DynamicTable, tenantId);
        }
        return model;
    }

    let tableDefinition = await DynamicTable.findOne({
      where: { name: physicalTableName },
      include: [{ model: DynamicColumn, as: 'columns' }],
    });

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
}

export default new DynamicDataService(); 