const bcrypt = require("bcrypt");
const argv = require("yargs/yargs")(process.argv.slice(2)).argv;

const plainPassword = argv.p || argv.password || process.env.PASSWORD;
const saltRounds = parseInt(argv.s || argv.salt || "10", 10);

if (!plainPassword) {
  console.error(
    "Provide a password via --password or PASSWORD env var. This tool avoids hardcoded secrets."
  );
  process.exit(2);
}

bcrypt.hash(plainPassword, saltRounds, function (err, hash) {
  if (err) throw err;
  console.log("Hashed Password:", hash);
});
