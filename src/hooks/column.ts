import CacheService from "@/services/CacheService";
import { ColumnDataTypes } from "@/utils";

export async function beforeCreate(data) {
  console.log("beforeCreate hook for demo table", data);
  if( data.dataType == ColumnDataTypes.ID  &&  data.relatedToTableId) {
    let refTable = await CacheService.getTableById(data.relatedToTableId)
    data.ui = {
      mask: "1111111111",
      
      component: "FkPicker",
      componentProps: {
        table: refTable.alias_name
      }
    }
  } else if(data.dataType == ColumnDataTypes.ENUM) {
    data.ui = {
      mask: "1111111111",
      
      component: "Select",
    };
  } else if(data.dataType == ColumnDataTypes.DATE) {
    data.ui = {
      mask: "1111111111",
      
      component: "DatePicker",
    };
  } else {
    data.ui = {
      mask: "1111111111",
      filterOp: 'llike',
      component: "Input",
    };
  }
}

export async function afterCreate(instance) {
  console.log("afterCreate hook for demo table", instance);
}

export async function beforeUpdate(id, data) {
  console.log("beforeUpdate hook for demo table", id, data);
  data.updatedAt = new Date();
  return data;
}

export async function afterUpdate(id, data) {
  console.log("afterUpdate hook for demo table", id, data);
}

export async function beforeDelete(id) {
  console.log("beforeDelete hook for demo table", id);
}

export async function afterDelete(id) {
  console.log("afterDelete hook for demo table", id);
}
