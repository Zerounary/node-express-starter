import { Model, ModelCtor, DataTypes } from 'sequelize';
import sequelize from '../db/sequelize';
import { DynamicTable, DynamicColumn } from '../db/models';
import { logError } from '../logger';

class DynamicDataService {
  private modelCache: Map<string, ModelCtor<Model<any, any>>> = new Map();
  private relationsCache: Map<string, boolean> = new Map();

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

  private mapDataType(dataType: string) {
    switch (dataType.toUpperCase()) {
      case 'STRING': return DataTypes.STRING;
      case 'TEXT': return DataTypes.TEXT;
      case 'INTEGER': return DataTypes.INTEGER;
      case 'FLOAT': return DataTypes.FLOAT;
      case 'DOUBLE': return DataTypes.DOUBLE;
      case 'DECIMAL': return DataTypes.DECIMAL;
      case 'BOOLEAN': return DataTypes.BOOLEAN;
      case 'DATE': return DataTypes.DATE;
      case 'JSON': return DataTypes.JSON;
      default: throw new Error(`Unsupported data type: ${dataType}`);
    }
  }

  public async defineRelationships(model: ModelCtor<Model>, tableDefinition: DynamicTable, tenantId: number) {
    const cacheKey = `${tenantId}:${tableDefinition.name}`;
    if (this.relationsCache.has(cacheKey)) return;

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
    this.relationsCache.set(cacheKey, true);
  }

  public async getModelForTable(tableName: string, tenantId: number): Promise<ModelCtor<Model<any, any>>> {
    const cacheKey = `${tenantId}:${tableName}`;
    if (this.modelCache.has(cacheKey)) {
        const model = this.modelCache.get(cacheKey)!;
        // Ensure relationships are defined, even if model is from cache
        await this.defineRelationships(model, await DynamicTable.findOne({where: {name: tableName, tenantId}, include: [DynamicColumn]}) as DynamicTable, tenantId)
        return model;
    }

    const tableDefinition = await DynamicTable.findOne({
      where: { name: tableName, tenantId },
      include: [{ model: DynamicColumn, as: 'columns' }],
    });

    if (!tableDefinition) {
      throw new Error(`Table '${tableName}' not found for the current tenant.`);
    }

    const attributes = this.getSequelizeAttributes(tableDefinition.columns!);
    attributes.tenantId = { type: DataTypes.INTEGER, allowNull: false };
    
    const Model = sequelize.define(tableName, attributes, { tableName, timestamps: false });
    this.modelCache.set(cacheKey, Model);
    
    await this.defineRelationships(Model, tableDefinition, tenantId);

    return Model;
  }
}

export default new DynamicDataService(); 