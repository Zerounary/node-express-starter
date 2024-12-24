const User = require("../../../db/models/user");

module.exports = (api) => {
  api.post("/user", async (req, res) => {
    console.log(req.body);
    let user = new User({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
    });
    res.send(user.id);
  });
};
