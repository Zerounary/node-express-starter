import { DynamicTable } from "@/db/models";
import sequelize from "@/db/sequelize";
import { logError } from "@/logger";
import { ok } from "@/router/api";
import { fail } from "assert";
import CacheService from "../CacheService";
import DynamicDataService from "../DynamicDataService";

export const getPhysicalTableName = async (
  aliasName: string,
  tenantId: number
): Promise<string> => {
  let t = await CacheService.getTableByAliasName(aliasName);
  return t ? t.name : aliasName;
};

export async function initDynamicTables() {
  try {
    console.log("Initializing dynamic tables...");
    let tables = await DynamicTable.findAll({
      raw: true,
    });
    if (tables.length === 0) {
      return;
    }

    const queryInterface = sequelize.getQueryInterface();
    const allTables = await queryInterface.showAllTables();

    for (const table of tables) {
      if (!allTables.includes(table.name)) {
        console.log(`Table "${table.name}" not found, creating...`);
        const Model = await DynamicDataService.getModelForTable(
          table.name,
          1,
        );
        await Model.sync({ alter: true });
        console.log(`Table "${table.name}" created.`);
      }
    }
    console.log("Dynamic tables initialized.");
    return ok("ok");
  } catch (error) {
    logError(error);
    console.error("Failed to initialize dynamic tables:", error);
    return fail(error.message || "Failed to initialize dynamic tables");
  }
}
