const bcrypt = require("bcrypt");

const plainPassword = "vsaries01$"; 
const saltRounds = 10;

bcrypt.hash(plainPassword, saltRounds, function (err, hash) {
  if (err) throw err;
  console.log("Hashed Password:", hash);
});
