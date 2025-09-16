import { AI } from "@/ai";
import { importTableData } from "@/utils/importData";

export async function ai_gen({ id, tableName, parentId, parentKey }) {
    let aiRsp = await AI([
    {
        role: "user",
        content: `{
    "name": "中共十八大提出，我国到2020年的奋斗目标是【  】",
    "items": [
      { "orderno": 1, "option_text": "实现\"四个现代化\"" },
      { "orderno": 2, "option_text": "基本实现现代化" },
      { "orderno": 3, "option_text": "全面建设小康社会" },
      { "orderno": 4, "option_text": "全面建成小康社会" }
    ],
    "answer": "4",
    "type": "single-choice"
  },


参考这个格式，出一套垃圾分类的题目，3道。最后结果以JSON数组形式返回`,
    },
    ]);

    if(aiRsp.choices.length > 0) {
        let first = aiRsp.choices[0];
        console.log(first.message.content)
        let rstJson = JSON.parse(first.message.content);
        await importTableData(tableName, rstJson, parentId, parentKey)
    }
    return {
        msg: '生成成功'
    }
}