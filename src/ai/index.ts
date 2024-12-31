import Axios from "axios";

const OPENAI_API_KEY = "acb14591ee5e30a9894f1a9c942d5b1b.191TVNj35UPld7Kn";

export const REQ = Axios.create({
  baseURL: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
});

// REQ.interceptors.request.use((config) => {
//   return config;
// });

export const AI = (data = []) => {
  return REQ({
    method: "post",
    data: {
      model: "glm-4",
      messages: [
        {
          role: "system",
          content: "你是一个专业的程序员，请根据用户需求，生成代码",
        },
        ...data,
      ],
    },
  });
};
