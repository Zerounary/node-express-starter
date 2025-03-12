import { verifySync } from "@/utils/protocol";

let is_jwt_check = true;

export const jwt_mid =  (req, res, next) => {
  if (is_jwt_check) {
    const token = req.headers.token
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Error!Token was not provided.",
      });
      return;
    }
    try {
      const decodedToken = verifySync(token);
      req.locals.auth = decodedToken;
      next();
    } catch (e) {
      res.status(401).json({
        success: false,
        message: "Error!Token was expired.",
      });
      return;
    }
  } else {
    next();
  }
}