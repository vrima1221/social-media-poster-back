import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import cors from "cors";
import twitterRoutes from './routes/twitter.js'
import linkedinRoutes from './routes/linkedin.js'

dotenv.config();

const app = express();

const PORT = process.env.PORT || 4000
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || "my-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true only if using HTTPS in production
      httpOnly: true,
      sameSite: 'lax',
    },
  })
);

app.use("/", linkedinRoutes);
app.use("/", twitterRoutes);

app.listen(PORT, () =>
  console.log(`✅ LinkedIn backend at http://localhost:${PORT}`)
);
