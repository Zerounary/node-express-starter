import { Model, DataTypes, BelongsToGetAssociationMixin } from 'sequelize';
import sequelize from '../sequelize';
import Tenant from './Tenant';
import DynamicTable from './DynamicTable';

class DocumentType extends Model {
  public id!: number;
  public tenantId!: number;
  public name!: string;
  public mainTableId!: number;
  public detailTableId!: number;
  public states!: string[];

  public readonly mainTable?: DynamicTable;
  public readonly detailTable?: DynamicTable;

  public getMainTable!: BelongsToGetAssociationMixin<DynamicTable>;
  public getDetailTable!: BelongsToGetAssociationMixin<DynamicTable>;
}

DocumentType.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  tenantId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Tenant,
      key: 'id',
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  mainTableId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: DynamicTable,
      key: 'id',
    },
  },
  detailTableId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: DynamicTable,
      key: 'id',
    },
  },
  states: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
  },
}, {
  sequelize,
  tableName: 'document_types',
  timestamps: true,
  indexes: [{
    unique: true,
    fields: ['tenantId', 'name'],
  }]
});

DocumentType.belongsTo(DynamicTable, { as: 'mainTable', foreignKey: 'mainTableId' });
DocumentType.belongsTo(DynamicTable, { as: 'detailTable', foreignKey: 'detailTableId' });

export default DocumentType; 