import HyperExpress from "hyper-express";
import logger from "@/logger";
import jwt from "jsonwebtoken";

const pub_router = new HyperExpress.Router();

pub_router.post("/login", async (req, res, next) => {
  let { email, password } = await req.json();
  let token;
  try {
    //Creating jwt token
    token = jwt.sign(
      {
        userId: 1,
        email,
      },
      "secretkeyappearshere",
      { expiresIn: "1h" }
    );
  } catch (err) {
    console.log(err);
    const error = new Error("Error! Something went wrong.");
    return next(error);
  }
  res.json({
    data: {
      id: 1,
      email,
      token,
    }
  });
});

export default pub_router;
