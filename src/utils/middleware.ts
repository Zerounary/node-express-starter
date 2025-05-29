
//跨域中间件
export const crossMid = (req, res, next) => {
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
  } else {
    next();
  }
}