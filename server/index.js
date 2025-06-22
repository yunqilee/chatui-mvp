import express from "express";
import dotenv from "dotenv";
import { SignJWT, importPKCS8 } from "jose";

dotenv.config();

const app = express();
app.use(express.json());

app.post("/generate-jwt", async (req, res) => {
  try {
    const { privateKey } = req.body;

    const key = await importPKCS8(privateKey, "ES256");

    const jwt = await new SignJWT({ "some-claim": "some-value" })
      .setProtectedHeader({ alg: "ES256" })
      .sign(key);

    res.json({ jwt });
  } catch (error) {
    console.error("Error generating JWT:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
