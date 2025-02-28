import HyperExpress from "hyper-express";
import LiveDirectory from "live-directory";
import path from "path";
const webserver = new HyperExpress.Server({
  max_body_buffer: 1024 * 1,
  max_body_length: 1024 * 1024 * 300,
});

import pub_api from "@/router/api/pub";
import api_v1_router from "@/router/api/v1";
import ws_router from "@/router/ws";
import { request } from "http";
import { response } from "express";
import db from "./db";

// 跨域设置
webserver.use((req, res, next) => {
  // 允许所有来源的跨域请求
  res.setHeader("Access-Control-Allow-Origin", "*");
  // 允许的请求方法
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  // 允许的请求头
  res.setHeader("Access-Control-Allow-Headers", "*");
  // 允许携带凭证（如 cookies）
  res.setHeader("Access-Control-Allow-Credentials", "true");
  console.log("options");

  if (req.method.toLocaleLowerCase() == "options") {
    res.send("");
    next();
  } else {
    next();
  }
});

webserver.use("/", pub_api);
webserver.use("/api/v1", api_v1_router);
webserver.use("/ws", ws_router);

const LiveAssets = new LiveDirectory("./assets/", {
  // Optional: Configure filters to ignore or include certain files, names, extensions etc etc.
  cache: {
    max_file_size: 1024 * 1024 * 300, // 300MB
  },
  filter: {
    // keep: {
    //     // Something like below can be used to only serve images, css, js, json files aka. most common web assets ONLY
    //     extensions: ['css', 'js', 'json', 'png', 'jpg', 'jpeg', 'html', 'htm', 'zip']
    // },
  },
});

webserver.get("/", (request, response) => {
  return response.redirect("/assets/index.html");
});

// Create static serve route to serve frontend assets
webserver.get("/assets/*", (request, response) => {
  // Strip away '/assets' from the request path to get asset relative path
  // Lookup LiveFile instance from our LiveDirectory instance.
  const path = request.path.replace("/assets", "");
  // Retrieve the LiveFile instance for this asset
  const asset = LiveAssets.get(path);
  if (!asset) return response.status(404).send("Not Found");

  // Send the asset content as response depending on if the file is cached
  if (asset.cached) {
    // Simply send the Buffer returned by asset.content as the response
    // You can convert a Buffer to a string using Buffer.toString() if your webserver requires string response body
    return response.send(asset.content);
  } else {
    // For files that are not cached, you must create a stream and pipe it as the response for memory efficiency
    const readable = asset.stream();
    return readable.pipe(response);
  }
});

// Activate webserver by calling .listen(port, callback);
const port = 22989;
webserver
  .listen(port)
  .then(async () => {
    console.log(`Webserver started on port ${port}`);
    // 自动同步数据库
    await db.sync({ alter: true });
  })
  .catch(() => console.log(`Failed to start webserver on port ${port}`));
