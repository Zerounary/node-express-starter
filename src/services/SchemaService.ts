import { DataTypes, QueryInterface } from 'sequelize';
import sequelize from '../db/sequelize';
import { DynamicTable, DynamicColumn } from '../db/models';
import { getPhysicalTableName } from './utils/dynamic';

class SchemaService {
  private queryInterface: QueryInterface;

  constructor() {
    this.queryInterface = sequelize.getQueryInterface();
  }

  private async getPhysicalTableName(tableName: string, tenantId: number): Promise<string> {
    return await getPhysicalTableName(tableName, tenantId);
  }

  public async createTableFromDefinition(tableId: number) {
    const tableDefinition = (await DynamicTable.findByPk(tableId, {
      include: [{ model: DynamicColumn, as: 'columns' }],
    }));

    if (!tableDefinition) {
      throw new Error('Table definition not found');
    }

    const physicalTableName = await this.getPhysicalTableName(tableDefinition.name, tableDefinition.tenantId);
    const attributes = this.getSequelizeAttributes(tableDefinition.columns!);

    await this.queryInterface.createTable(physicalTableName, attributes);
  }

  public async addColumnFromDefinition(columnId: number) {
    const columnDefinition = (await DynamicColumn.findByPk(columnId, {
        include: [{model: DynamicTable, as: 'table'}]
    }));
    
    if (!columnDefinition) {
        throw new Error('Column definition not found');
    }

    const table = columnDefinition.table;
    const physicalTableName = await this.getPhysicalTableName(table.name, table.tenantId);
    const attribute = this.getSequelizeAttributes([columnDefinition]);
    
    await this.queryInterface.addColumn(
        physicalTableName, 
        columnDefinition.name, 
        attribute[columnDefinition.name]
    );
  }

  public async dropColumn(tableName: string, columnName: string, tenantId: number) {
    const physicalTableName = await this.getPhysicalTableName(tableName, tenantId);
    await this.queryInterface.removeColumn(physicalTableName, columnName);
  }

  public async changeColumn(tableName: string, columnName: string, columnDefinition: DynamicColumn, tenantId: number) {
    const physicalTableName = await this.getPhysicalTableName(tableName, tenantId);
    const attribute = this.getSequelizeAttributes([columnDefinition]);
    await this.queryInterface.changeColumn(
      physicalTableName,
      columnName,
      attribute[columnDefinition.name]
    );
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
        if(column.name === 'id') continue;
      attributes[column.name] = {
        type: this.mapDataType(column.dataType),
        allowNull: true, // 简化处理，可扩展
      };
    }

    // 添加默认字段
    attributes['tenantId'] = { type: DataTypes.INTEGER, allowNull: true };
    attributes['createdAt'] = { type: DataTypes.DATE, allowNull: true };
    attributes['updatedAt'] = { type: DataTypes.DATE, allowNull: true };
    
    return attributes;
  }

  private mapDataType(dataType: string) {
    switch (dataType.toUpperCase()) {
      case 'ID':
        return DataTypes.BIGINT;
      case 'STRING':
        return DataTypes.STRING;
      case 'TEXT':
        return DataTypes.TEXT;
      case 'INTEGER':
        return DataTypes.INTEGER;
      case 'FLOAT':
        return DataTypes.FLOAT;
      case 'DOUBLE':
        return DataTypes.DOUBLE;
      case 'DECIMAL':
        return DataTypes.DECIMAL;
      case 'BOOLEAN':
        return DataTypes.BOOLEAN;
      case 'DATE':
        return DataTypes.DATE;
      case 'JSON':
        return DataTypes.JSON;
      default:
        throw new Error(`Unsupported data type: ${dataType}`);
    }
  }
}

export default new SchemaService(); 