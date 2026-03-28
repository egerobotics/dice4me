import { TwitterApi, ETwitterStreamEvent } from "twitter-api-v2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getClient() {
  return new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_SECRET!,
  });
}

function getAppClient() {
  const raw = process.env.TWITTER_BEARER_TOKEN!;
  const token = raw.includes("%3D") ? decodeURIComponent(raw) : raw;
  return new TwitterApi(token);
}

let myUserId: string | null = null;

async function isFollower(userId: string): Promise<boolean> {
  const client = getAppClient();
  try {
    if (!myUserId) {
      const userClient = getClient();
      const me = await userClient.v2.me();
      myUserId = me.data.id;
    }
    const result = await client.v2.followers(myUserId, { max_results: 100 });
    const raw = result.data as unknown;
    const followerList = Array.isArray(raw) ? raw : (raw as { data?: { id: string }[] })?.data || [];
    return followerList.some((f: { id: string }) => f.id === userId);
  } catch (err) {
    console.error("Follower check error:", err);
    return false;
  }
}

async function processTweet(tweetId: string, authorId: string, username: string) {
  const userClient = getClient();

  // Skip our own tweets
  if (!myUserId) {
    const me = await userClient.v2.me();
    myUserId = me.data.id;
  }
  if (authorId === myUserId) return;

  // Skip already processed
  const existing = await prisma.roll.findFirst({ where: { twitterTweetId: tweetId } });
  if (existing) return;

  // Check follower
  const follower = await isFollower(authorId);
  if (!follower) {
    try {
      await userClient.v2.tweet({
        text: `@${username} You need to follow @dice4me first to roll dice! 🎲\n\nFollow us and try again.`,
        reply: { in_reply_to_tweet_id: tweetId },
      });
    } catch (err) {
      console.error("Follow reply error:", err);
    }
    return;
  }

  // Create roll
  const roll = await prisma.roll.create({
    data: {
      triggeredBy: "twitter",
      twitterTweetId: tweetId,
      twitterUser: `@${username}`,
    },
  });

  console.log(`Roll #${roll.rollNumber} created for @${username}`);

  // Reply with roll number
  try {
    const numberReply = await userClient.v2.tweet({
      text: `@${username} 🎲 Your roll number is #${roll.rollNumber}. Rolling dice now...`,
      reply: { in_reply_to_tweet_id: tweetId },
    });
    await prisma.roll.update({
      where: { id: roll.id },
      data: { replyTweetId: numberReply.data.id },
    });
  } catch (err) {
    console.error("Roll number reply error:", err);
  }

  // Trigger Pi
  const PI_TRIGGER_URL = process.env.PI_TRIGGER_URL!;
  const API_KEY = process.env.DICE4ME_API_KEY!;
  const CALLBACK_URL = `${process.env.NEXTAUTH_URL}/api/roll/callback`;

  try {
    await fetch(PI_TRIGGER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
      body: JSON.stringify({ rollId: roll.id, callbackUrl: CALLBACK_URL }),
    });
  } catch (err) {
    console.error("Pi trigger error:", err);
    await prisma.roll.update({
      where: { id: roll.id },
      data: { status: "failed", errorMessage: String(err) },
    });
  }
}

async function setupStream() {
  const appClient = getAppClient();

  // Clear existing rules
  const existingRules = await appClient.v2.streamRules();
  if (existingRules.data?.length) {
    await appClient.v2.updateStreamRules({
      delete: { ids: existingRules.data.map((r) => r.id) },
    });
    console.log("Cleared old stream rules");
  }

  // Add new rule: mentions of @dice4me with "roll"
  await appClient.v2.updateStreamRules({
    add: [{ value: "@dice4me roll", tag: "dice-roll" }],
  });
  console.log("Stream rule added: @dice4me roll");

  // Start stream
  const stream = await appClient.v2.searchStream({
    "tweet.fields": "author_id",
    "user.fields": "username",
    expansions: "author_id",
  });

  stream.autoReconnect = true;
  stream.autoReconnectRetries = Infinity;

  stream.on(ETwitterStreamEvent.Data, async (event) => {
    const tweet = event.data;
    const users = event.includes?.users || [];
    const user = users.find((u) => u.id === tweet.author_id);
    const username = user?.username || "unknown";

    console.log(`Stream received: @${username}: ${tweet.text}`);

    try {
      await processTweet(tweet.id, tweet.author_id!, username);
    } catch (err) {
      console.error("Process tweet error:", err);
    }
  });

  stream.on(ETwitterStreamEvent.Connected, () => {
    console.log("Twitter stream connected!");
  });

  stream.on(ETwitterStreamEvent.Reconnected, () => {
    console.log("Twitter stream reconnected!");
  });

  stream.on(ETwitterStreamEvent.ConnectionError, (err) => {
    console.error("Twitter stream connection error:", err);
  });

  console.log("Twitter filtered stream started, listening for @dice4me roll...");
}

// Load env
import("dotenv/config").then(() => {
  setupStream().catch((err) => {
    console.error("Failed to start stream:", err);
    process.exit(1);
  });
});
