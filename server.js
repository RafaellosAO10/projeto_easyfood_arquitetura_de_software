require("dotenv").config({ quiet: true });

const app = require("./src/app");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET não definido. Configure a variável no arquivo .env.");
  process.exit(1);
}

app.listen(3000, () => {
  console.log("EasyFood rodando na porta 3000");
});
