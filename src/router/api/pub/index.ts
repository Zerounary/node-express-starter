import HyperExpress from "hyper-express";
import logger from "@/logger";
import { JWT_TOKEN_KEY } from "@/utils/protocol";
import { createSigner } from "fast-jwt";

const pub_router = new HyperExpress.Router();

const signSyc = createSigner({ key: JWT_TOKEN_KEY})

pub_router.post("/login", async (req, res, next) => {
  let { email, password } = await req.json();
  let token;
  try {
    //Creating jwt token
    // token = jwt.sign(
    //   {
    //     userId: 1,
    //     email,
    //   },
    //   JWT_TOKEN_KEY,
    //   { expiresIn: "1h" }
    // );
    token = signSyc({ userId: 1, email })
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
