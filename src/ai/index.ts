import Axios from "axios";
import exp from "constants";
import OpenAI from "openai";

const OPENAI_API_KEY = "acb14591ee5e30a9894f1a9c942d5b1b.191TVNj35UPld7Kn";

export const ZHIPU_AI_REQ = Axios.create({
  baseURL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
});

export const get_zhipu_ai_req = (data) => {
  return ZHIPU_AI_REQ({
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

let doubao_ai_key = "67db776c-5c43-4723-ba12-492ec1c0f258";

export const openai = new OpenAI({
  apiKey: doubao_ai_key,
  baseURL: "https://ark.cn-beijing.volces.com/api/v3",
});

export const get_doubao_image_req = (data) => {
  return openai.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: '这是哪里？' },
          {
            type: 'image_url',
            image_url: {
              url: 'https://ark-project.tos-cn-beijing.ivolces.com/images/view.jpeg',
            },
          },
        ],
      },
    ],
    model: 'ep-20250218135757-5bfts',
  })
};

export const get_doubao_text_req = (data = []) => {
  return openai.chat.completions.create({
    model: 'doubao-seed-1-6-250615',
    // @ts-expect-error 
    thinking: {type: 'disabled'},
    messages: [
      { role: 'system', content: '你是豆包，是由字节跳动开发的 AI 人工智能助手' },
      ...data,
    ],
  })
};

export const get_doubao_text_stream_req = (data = []) => {
  return openai.chat.completions.create({
    model: 'doubao-seed-1-6-250615',
    messages: [
      { role: 'system', content: '你是豆包，是由字节跳动开发的 AI 人工智能助手' },
      ...data,
    ],
    stream: true,
  })
};

export const AI = (data = []) => {
  // return get_zhipu_ai_req(data);
  return get_doubao_text_req(data)
};

export const AI_Stream = (data = []) => {
  // return get_zhipu_ai_req(data);
  return get_doubao_text_stream_req(data)
};
