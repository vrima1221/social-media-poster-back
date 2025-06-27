import axios from "axios";
import multer from "multer";
import fs from "fs";
import jwt from 'jsonwebtoken'
import { Router } from "express";
import 'dotenv/config'

const router = Router()

const upload = multer({ dest: "uploads/" });

const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

const SCOPE = "openid profile w_member_social";

router.get("/auth/linkedin", (req, res) => {
  const state = Math.random().toString(36).substring(2);
  req.session.state = state;

  const authUrl =
    `https://www.linkedin.com/oauth/v2/authorization` +
    `?response_type=code&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&scope=${encodeURIComponent(SCOPE)}&state=${state}`;

  res.redirect(authUrl);
});

router.get("/auth/linkedin/callback", async (req, res) => {
  const { code, state } = req.query;
  if (state !== req.session.state) return res.status(403).send("Invalid state");

  try {
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      null,
      {
        params: {
          grant_type: "authorization_code",
          code,
          redirect_uri: REDIRECT_URI,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    const { access_token, id_token } = tokenRes.data;
    req.session.accessToken = access_token;

    const decoded = jwt.decode(id_token);

    // Optionally get more detailed info via /userinfo
    const profileRes = await axios.get("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    req.session.user = {
      name: profileRes.data.name || decoded.name,
      email: profileRes.data.email || decoded.email,
      picture: profileRes.data.picture || decoded.picture,
      sub: decoded.sub,
    };

    req.session.urn = `urn:li:person:${decoded.sub}`;
    req.session.save(() => {
      res.redirect(`${process.env.FRONTEND_URL}`);
    });
  } catch (err) {
    console.error("LinkedIn OAuth Error:", err.response?.data || err.message);
    res.status(500).send("OAuth callback failed");
  }
});

router.get('/auth/linkedin/me', (req, res) => {  
  if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });
  res.json(req.session.user);
});

router.post("/linkedin/post", upload.single("media"), async (req, res) => {
  const accessToken = req.session.accessToken;
  const author = req.session.urn;
  const text = req.body.text;
  const file = req.file;

  if (!accessToken || !author)
    return res.status(401).json({ error: "Not authenticated with LinkedIn" });

  let media = null;
  let category = "NONE";

  if (file) {
    const type = file.mimetype.startsWith("video")
      ? "feedshare-video"
      : "feedshare-image";

    const register = await axios.post(
      "https://api.linkedin.com/v2/assets?action=registerUpload",
      {
        registerUploadRequest: {
          owner: author,
          recipes: [`urn:li:digitalmediaRecipe:${type}`],
          serviceRelationships: [
            {
              relationshipType: "OWNER",
              identifier: "urn:li:userGeneratedContent",
            },
          ],
        },
      },
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    const uploadUrl =
      register.data.value.uploadMechanism[
        Object.keys(register.data.value.uploadMechanism)[0]
      ].uploadUrl;

    await axios.put(uploadUrl, fs.readFileSync(file.path), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": file.mimetype,
      },
    });

    fs.unlinkSync(file.path);
    media = register.data.value.asset;
    category = type.includes("video") ? "VIDEO" : "IMAGE";
  }

  const payload = {
    author,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text },
        shareMediaCategory: category,
        media: media
          ? [
              {
                status: "READY",
                description: { text: "" },
                media,
                title: { text: "My Post" },
              },
            ]
          : [],
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  try {
    const result = await axios.post(
      "https://api.linkedin.com/v2/ugcPosts",
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0",
          "Content-Type": "application/json",
        },
      }
    );
    
    res.json({ success: true, postUrn: result.data.id });
  } catch (err) {
    console.error("Post error:", err.response?.data || err.message);
    res.status(500).json({ error: "Post failed" });
  }
});

export default router