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
      },
      ...data.ui
    }
  } else if(data.dataType == ColumnDataTypes.ENUM) {
    data.ui = {
      mask: "1111111111",
      component: "Select",
      ...data.ui
    };
  } else if(data.dataType == ColumnDataTypes.DATE) {
    data.ui = {
      mask: "1111111111",
      component: "DatePicker",
      componentProps: {
        showTime: false,
        valueFormat: 'YYYY-MM-DD HH:mm:ss'
      },
      ...data.ui
    };
  } else if(data.dataType == ColumnDataTypes.DATETIME) {
    data.ui = {
      mask: "1111111111",
      component: "DatePicker",
      componentProps: {
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss'
      },
      ...data.ui
    }
  } else if(data.dataType == ColumnDataTypes.DATERANGE){
    data.ui = {
      mask: "1111111111",
      component: "RangePicker",
      componentProps: {
        showTime: true,
        valueFormat: 'YYYY-MM-DD HH:mm:ss'
      },
      ...data.ui
    }

  } else if(data.dataType == ColumnDataTypes.BOOLEAN) {
    data.ui = {
      mask: "1111111111",
      component: "Checkbox",
      ...data.ui
    };
  } else if (data.dataType == ColumnDataTypes.REGION) {
    data.ui = {
      mask: "1111111111",
      component: "LocatePicker",
      ...data.ui
    };
  }  else if (data.dataType == ColumnDataTypes.QTY || data.dataType == ColumnDataTypes.AMT) {
    data.ui = {
      mask: "1111111111",
      component: "InputNumber",
      filterOp: 'gte',
      ...data.ui
    };
  } else {
    data.ui = {
      mask: "1111111111",
      filterOp: 'like',
      component: "Input",
      ...data.ui
    };
  }
  // 如果组是分隔的话
  if(data.component == 'Divider') {
    data.ui = {
      ...data.ui,
      mask: "0010000000",
      dataType: ColumnDataTypes.VIRTUAL,
    }
  }
}

export async function afterCreate(instance) {
  console.log("afterCreate hook for demo table", instance);
}

export async function beforeUpdate(id, data) {
  console.log("beforeUpdate hook for demo table", id, data);
  data.updatedAt = new Date();

  if(data.ui?.component == 'Divider') {
    data.ui = {
      ...data.ui,
      mask: "0010000000",
      dataType: ColumnDataTypes.VIRTUAL,
    }
  }
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
