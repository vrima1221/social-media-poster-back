import { Router } from "express";
import { TwitterApi } from "twitter-api-v2";
import multer from "multer";
import fs from "fs";
import path from "path";
import "dotenv/config";

const router = Router();

const upload = multer({ dest: "uploads/" });

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
});

router.get("/auth/twitter", async (req, res) => {
  const { url, oauth_token, oauth_token_secret } =
    await client.generateAuthLink(process.env.TWITTER_CALLBACK_URL);

  req.session.oauthToken = oauth_token;
  req.session.oauthTokenSecret = oauth_token_secret;

  res.redirect(url);
});

router.get("/auth/twitter/callback", async (req, res) => {
  const { oauth_token, oauth_verifier } = req.query;

  const storedToken = req.session.oauthToken;
  const storedSecret = req.session.oauthTokenSecret;

  if (!oauth_token || !oauth_verifier || oauth_token !== storedToken) {
    return res.status(400).send("Invalid session or expired token");
  }

  try {
    const tempClient = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET,
      accessToken: storedToken,
      accessSecret: storedSecret,
    });

    const {
      client: userClient,
      accessToken,
      accessSecret,
    } = await tempClient.login(oauth_verifier);

    const { data: user } = await userClient.v2.me();

    req.session.twitterUser = {
      name: user.name,
      username: user.username,
      id: user.id,
    };

    req.session.twitterTokens = { accessToken, accessSecret };

    delete req.session.oauthToken;
    delete req.session.oauthTokenSecret;

    req.session.save(() => {
      res.redirect(`${process.env.FRONTEND_URL}`);
    });
  } catch (err) {
    console.error("Twitter callback failed:", err);
    res.status(401).send("Twitter login failed: " + err.message);
  }
});

router.get("/auth/twitter/me", (req, res) => {
  if (!req.session.twitterUser)
    return res.status(401).json({ error: "Not authenticated" });
  res.json(req.session.twitterUser);
});

router.post("/twitter/post", upload.single("media"), async (req, res) => {
  const tokens = req.session.twitterTokens;
  if (!tokens) return res.status(401).send("Not connected to Twitter.");

  const rwClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: tokens.accessToken,
    accessSecret: tokens.accessSecret,
  }).readWrite;

  try {
    let mediaId;
    if (req.file) {
      const mediaPath = path.resolve(req.file.path);
      const mediaType = req.file.mimetype;
      const isVideo = mediaType.startsWith("video/");

      mediaId = await rwClient.v1.uploadMedia(mediaPath, {
        mimeType: mediaType,
        type: isVideo ? "video" : undefined,
      });

      fs.unlink(mediaPath, (err) => {
        if (err) console.error("Failed to delete temp media file:", err);
      });
    }

    const tweetPayload = {
      text: req.body.text || "",
    };

    if (mediaId) {
      tweetPayload.media = { media_ids: [mediaId] };
    }

    const tweet = await rwClient.v2.tweet(tweetPayload);

    res.json({ success: true, tweetId: tweet.data.id });
  } catch (err) {
    console.error("Tweet failed:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
