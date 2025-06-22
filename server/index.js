import express from "express";
import dotenv from "dotenv";
import { SignJWT, importPKCS8 } from "jose";

dotenv.config();

const app = express();

const privateKey = process.env.PRIVATE_KEY;

app.get("/generate-jwt", (req, res) => {
  importPKCS8(privateKey, "EdDSA")
    .then((privateKey) => {
      const customHeader = {
        alg: "EdDSA",
        kid: process.env.kid,
      };
      const iat = Math.floor(Date.now() / 1000) - 30;
      const exp = iat + 900;
      const customPayload = {
        sub: process.env.sub,
        iat: iat,
        exp: exp,
      };
      new SignJWT(customPayload)
        .setProtectedHeader(customHeader)
        .sign(privateKey)
        .then((token) => console.log("JWT: " + token));
    })
    .catch((error) => console.error(error));
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
