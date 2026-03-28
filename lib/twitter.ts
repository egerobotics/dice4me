import { TwitterApi } from "twitter-api-v2";
import { prisma } from "./db";
import { readFile } from "fs/promises";
import { join } from "path";

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

// Cache our own user ID
let myUserId: string | null = null;

// Check if a user follows @dice4me using bearer token
async function isFollower(userId: string): Promise<boolean> {
  const client = getAppClient();

  try {
    if (!myUserId) {
      const userClient = getClient();
      const me = await userClient.v2.me();
      myUserId = me.data.id;
    }

    // Use bearer token to get followers
    const result = await client.v2.followers(myUserId, { max_results: 100 });
    const raw = result.data as unknown;
    const followerList = Array.isArray(raw) ? raw : (raw as { data?: { id: string }[] })?.data || [];
    return followerList.some((f: { id: string }) => f.id === userId);
  } catch (err) {
    console.error("Follower check error:", err);
    return false;
  }
}

export async function checkMentions() {
  const appClient = getAppClient();
  const userClient = getClient();

  // Get last processed tweet ID
  const setting = await prisma.setting.findUnique({
    where: { key: "last_processed_tweet_id" },
  });
  const sinceId = setting?.value;

  // Search for mentions with "roll" command
  const query = "@dice4me roll";
  const params: Record<string, string> = {
    "tweet.fields": "author_id,created_at",
    "user.fields": "username",
    expansions: "author_id",
    max_results: "10",
  };
  if (sinceId) params.since_id = sinceId;

  const result = await appClient.v2.search(query, params);

  const tweets = result.data?.data || [];
  const users = result.data?.includes?.users || [];

  let newestId = sinceId;

  // Get our own ID to skip our own tweets
  if (!myUserId) {
    const userClient = getClient();
    const me = await userClient.v2.me();
    myUserId = me.data.id;
  }

  for (const tweet of tweets) {
    const user = users.find((u) => u.id === tweet.author_id);
    const username = user?.username || "unknown";

    // Track newest ID
    if (!newestId || tweet.id > newestId) {
      newestId = tweet.id;
    }

    // Skip our own tweets
    if (tweet.author_id === myUserId) continue;

    // Skip already processed tweets
    const existing = await prisma.roll.findFirst({
      where: { twitterTweetId: tweet.id },
    });
    if (existing) continue;

    // Check if user is a follower
    const follower = await isFollower(tweet.author_id!);

    if (!follower) {
      // Reply: please follow first
      try {
        await userClient.v2.tweet({
          text: `@${username} You need to follow @dice4me first to roll dice! 🎲\n\nFollow us and try again.`,
          reply: { in_reply_to_tweet_id: tweet.id },
        });
      } catch (err) {
        console.error("Follow reply error:", err);
      }
      continue;
    }

    // Create roll
    const roll = await prisma.roll.create({
      data: {
        triggeredBy: "twitter",
        twitterTweetId: tweet.id,
        twitterUser: `@${username}`,
      },
    });

    // Reply with roll number immediately
    try {
      const numberReply = await userClient.v2.tweet({
        text: `@${username} 🎲 Your roll number is #${roll.rollNumber}. Rolling dice now...`,
        reply: { in_reply_to_tweet_id: tweet.id },
      });
      // Save first reply ID so photo reply chains to it
      await prisma.roll.update({
        where: { id: roll.id },
        data: { replyTweetId: numberReply.data.id },
      });
    } catch (err) {
      console.error("Roll number reply error:", err);
    }
  }

  // Update cursor
  if (newestId && newestId !== sinceId) {
    await prisma.setting.upsert({
      where: { key: "last_processed_tweet_id" },
      update: { value: newestId },
      create: { key: "last_processed_tweet_id", value: newestId },
    });
  }

  return tweets.length;
}

export async function postTwitterReply(
  tweetId: string,
  photoUrl: string | null,
  rollId: string
) {
  const client = getClient();
  const roll = await prisma.roll.findUnique({ where: { id: rollId } });
  if (!roll) return;

  let mediaId: string | undefined;

  // Upload photo if available
  if (photoUrl) {
    const filepath = photoUrl.startsWith("/api/rolls/")
      ? join(process.cwd(), "data", "rolls", photoUrl.replace("/api/rolls/", ""))
      : join(process.cwd(), "public", photoUrl);
    const buffer = await readFile(filepath);
    mediaId = await client.v1.uploadMedia(buffer, { mimeType: "image/jpeg" });
  }

  const text = `🎲 Roll #${roll.rollNumber} result!\n\ndice4.me`;

  // Reply to the first reply (roll number tweet) if available, otherwise to original tweet
  const replyToId = roll.replyTweetId || tweetId;

  const photoReply = await client.v2.tweet({
    text,
    reply: { in_reply_to_tweet_id: replyToId },
    ...(mediaId ? { media: { media_ids: [mediaId] } } : {}),
  });

  // Retweet the photo reply to show on main timeline
  try {
    const me = await client.v2.me();
    await client.v2.retweet(me.data.id, photoReply.data.id);
  } catch (err) {
    console.error("Retweet error:", err);
  }
}

export async function postWebRollTweet(rollNumber: number, photoUrl: string) {
  const client = getClient();

  const filepath = photoUrl.startsWith("/api/rolls/")
    ? join(process.cwd(), "data", "rolls", photoUrl.replace("/api/rolls/", ""))
    : join(process.cwd(), "public", photoUrl);
  const buffer = await readFile(filepath);
  const mediaId = await client.v1.uploadMedia(buffer, { mimeType: "image/jpeg" });

  await client.v2.tweet({
    text: `🎲 Roll #${rollNumber} from dice4.me!\n\nRoll your own at dice4.me`,
    media: { media_ids: [mediaId] },
  });
}
