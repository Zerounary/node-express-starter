import Axios from "axios";

const OPENAI_API_KEY = "acb14591ee5e30a9894f1a9c942d5b1b.191TVNj35UPld7Kn";

export const REQ = Axios.create({
  baseURL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
});


export const AI = (data = []) => {
  return REQ({
    method: "post",
    data: {
      model: "glm-4",
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "你是一个系统后台的管理员，负责从用户的语句中，提取函数所需的参数，返回正确的执行响应的操作。",
        },
        ...data,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "save_system_prompt",
            description:
              '保存用户""或者“”符号中填写的内容到系统提示词中，传递参数时，省略开头和结尾的符号',
            parameters: {
              type: "object",
              properties: {
                content: {
                  type: "string",
                  description: "需要保存到提示词的内容",
                },
              },
              required: ["content"],
            },
          },
        },
      ],
    },
  });
};
