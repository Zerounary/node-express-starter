import { Model, ModelCtor } from 'sequelize';
import sequelize from '../db/sequelize';
import { DynamicTable, DynamicColumn } from '../db/models';
import SchemaService from './SchemaService';

class DynamicDataService {
  private modelCache: Map<string, ModelCtor<Model<any, any>>> = new Map();

  public async getModelForTable(tableName: string): Promise<ModelCtor<Model<any, any>>> {
    if (this.modelCache.has(tableName)) {
      return this.modelCache.get(tableName)!;
    }

    const tableDefinition = (await DynamicTable.findOne({
      where: { name: tableName },
      include: [{ model: DynamicColumn, as: 'columns' }],
    })).toJSON();

    if (!tableDefinition) {
      throw new Error(`Table '${tableName}' not found.`);
    }

    const attributes = (SchemaService as any).getSequelizeAttributes(tableDefinition.columns!);
    const model = sequelize.define(tableName, attributes, {
        tableName: tableName,
        timestamps: false
    });
    
    this.modelCache.set(tableName, model);
    return model;
  }
}

export default new DynamicDataService(); 