import DynamicColumn from "./DynamicColumn";
import DynamicTable from "./DynamicTable";
import TableCategory from "./TableCategory";
import Media from "./Media";
import MediaCategory from "./MediaCategory";

export function initializeAssociations() {
  // Existing associations from the original file
  DynamicTable.belongsTo(TableCategory, {
    foreignKey: "categoryId",
    as: "category",
  });

  TableCategory.hasMany(DynamicTable, {
    foreignKey: "categoryId",
    as: "tables",
  });

  TableCategory.belongsTo(TableCategory, {
    foreignKey: "parentId",
    as: "parent",
  });

  TableCategory.hasMany(TableCategory, {
    foreignKey: "parentId",
    as: "children",
  });

  DynamicTable.hasMany(DynamicColumn, {
    sourceKey: "id",
    foreignKey: "tableId",
    as: "columns",
  });

  DynamicColumn.belongsTo(DynamicTable, {
    foreignKey: "tableId",
    as: "table",
  });

  // New associations for Media and MediaCategory
  // MediaCategory self-referencing for parent-child relationship
  MediaCategory.hasMany(MediaCategory, {
    as: "children",
    foreignKey: "parentId",
  });
  MediaCategory.belongsTo(MediaCategory, {
    as: "parent",
    foreignKey: "parentId",
  });

  // Media and MediaCategory (Many-to-One)
  MediaCategory.hasMany(Media, { foreignKey: "categoryId" });
  Media.belongsTo(MediaCategory, { foreignKey: "categoryId" });
}

export default function setupAssociations() {
  initializeAssociations();
  console.log("Database associations have been set up");
}
