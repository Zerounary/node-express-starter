import { AI, AI_Stream } from "@/ai";
import { ok, fail } from "@/router/api";
import { Controller, Get } from "@/utils/routeDecorators";

@Controller("/ai")
export default class ai {
  @Get("/text")
  async text(req, res) {
    let text = req.query.text;
    try {
      let aiRsp = await AI([
        {
          role: "user",
          content: text,
        },
      ]);
      return ok(aiRsp);
    } catch (e) {
      return fail(e.mesage);
    }
  }

  @Get("/stream")
  async stream(req, res) {
    let text = req.query.text;
    try {
      // 设置响应头以支持流式传输
      // 设置编码为 utf-8
      res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      // res.flushHeaders();

      let stream = await AI_Stream([
        {
          role: "user",
          content: text,
        },
      ]);

      for await (const part of stream) {
        let text = part.choices[0]?.delta?.content || "";
        res.write(text);
      }
      res.end();
    } catch (e) {
      console.error("Error creating chat completion:", e);
      res.status(500).send("Error creating chat completion");
    }
  }
}
