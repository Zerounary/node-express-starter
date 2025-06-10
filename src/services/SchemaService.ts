import { DataTypes, QueryInterface } from 'sequelize';
import sequelize from '../db/sequelize';
import { DynamicTable, DynamicColumn } from '../db/models';

class SchemaService {
  private queryInterface: QueryInterface;

  constructor() {
    this.queryInterface = sequelize.getQueryInterface();
  }

  public async createTableFromDefinition(tableId: number) {
    const tableDefinition = (await DynamicTable.findByPk(tableId, {
      include: [{ model: DynamicColumn, as: 'columns' }],
    }))?.toJSON();

    if (!tableDefinition) {
      throw new Error('Table definition not found');
    }

    const attributes = this.getSequelizeAttributes(tableDefinition.columns!);

    await this.queryInterface.createTable(tableDefinition.name, attributes);
  }

  public async addColumnFromDefinition(columnId: number) {
    const columnDefinition = (await DynamicColumn.findByPk(columnId, {
        include: [{model: DynamicTable, as: 'table'}]
    }))?.toJSON();
    
    if (!columnDefinition) {
        throw new Error('Column definition not found');
    }

    const table = columnDefinition.table;
    const attribute = this.getSequelizeAttributes([columnDefinition]);
    
    await this.queryInterface.addColumn(
        table.name, 
        columnDefinition.name, 
        attribute[columnDefinition.name]
    );
  }

  public async dropColumn(tableName: string, columnName: string) {
    await this.queryInterface.removeColumn(tableName, columnName);
  }

  public async changeColumn(tableName: string, columnName: string, columnDefinition: DynamicColumn) {
    const attribute = this.getSequelizeAttributes([columnDefinition]);
    await this.queryInterface.changeColumn(
      tableName,
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
    attributes['created'] = { type: DataTypes.STRING, allowNull: true };
    attributes['createdAt'] = { type: DataTypes.DATE, allowNull: true };
    attributes['updated'] = { type: DataTypes.STRING, allowNull: true };
    attributes['updatedAt'] = { type: DataTypes.DATE, allowNull: true };
    
    return attributes;
  }

  private mapDataType(dataType: string) {
    switch (dataType.toUpperCase()) {
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