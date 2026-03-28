# dice4.me

Roll real physical dice remotely and see the result on camera.

A web application that controls a physical dice-rolling mechanism via a Raspberry Pi. Users can roll dice from the website or by mentioning [@dice4me](https://x.com/dice4me) on X.com.

## How It Works

```
User (Web/X.com) → VPS (Next.js) → Raspberry Pi → Servo rolls dice → Camera captures result → Photo displayed
```

1. User clicks "Roll Dice" on [dice4.me](https://dice4.me) or tweets `@dice4me roll`
2. VPS sends a trigger to the Raspberry Pi
3. Pi moves an RC servo to physically shake and roll two dice
4. Pi captures a photo from a USB camera
5. Photo is sent back to VPS, watermarked with roll number, and displayed
6. For X.com rolls: bot replies with the roll number and result photo

## Architecture

### VPS (dice4.me)
- **Next.js 15** (App Router) - Web frontend and API
- **PostgreSQL** + **Prisma** - Roll history and settings
- **Twitter API v2** - Filtered stream for real-time mention detection
- **Cloudflare Turnstile** - Bot protection
- **Sharp** - Photo watermarking (roll number, X.com username)

### Raspberry Pi 5
- **Fastify** - HTTP server for trigger and camera stream endpoints
- **gpiozero** (Python) - Servo motor control via GPIO
- **ffmpeg** - USB camera MJPEG stream and photo capture

## Project Structure

```
/home/dice4me/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── components/                 # React components
│   └── api/
│       ├── roll/route.ts           # POST: trigger roll, GET: history
│       ├── roll/[id]/route.ts      # GET: poll roll status
│       ├── roll/callback/route.ts  # POST: Pi sends result here
│       ├── rolls/[filename]/       # GET: serve roll photos
│       └── stream/route.ts         # GET: proxy camera snapshot
├── lib/
│   ├── db.ts                       # Prisma client
│   ├── pi.ts                       # Pi trigger helper
│   ├── twitter.ts                  # Twitter API (reply, retweet, post)
│   └── twitter-stream.ts           # Filtered stream listener
├── prisma/schema.prisma            # Database schema
├── pi/                             # Raspberry Pi codebase
│   └── src/
│       ├── index.ts                # Fastify server
│       ├── servo.ts                # Servo control (gpiozero/lgpio)
│       ├── camera.ts               # Photo capture from stream
│       └── stream.ts               # MJPEG stream from USB camera
└── data/rolls/                     # Saved roll photos
```

## Hardware

- Raspberry Pi 5
- SG90 or MG996R servo motor (GPIO 18)
- USB webcam (1280x720)
- Dice tray attached to servo arm
- 2x standard 6-sided dice

## Setup

### VPS

```bash
npm install
npx prisma db push
npm run build
npm start
```

### Raspberry Pi

```bash
cd pi
npm install
sudo apt install ffmpeg
sudo tsx src/index.ts
```

### Environment Variables

See `.env.local` for required variables:
- `PI_TRIGGER_URL` - Pi trigger endpoint
- `DICE4ME_API_KEY` - Shared API key
- `TWITTER_*` - Twitter API credentials
- `TURNSTILE_*` - Cloudflare Turnstile keys
- `DATABASE_URL` - PostgreSQL connection string

## X.com Integration

- Mention `@dice4me roll` to trigger a dice roll
- Must be following @dice4me to use
- Bot replies with roll number, then result photo
- Result photo is retweeted to main timeline
- Web rolls are also posted as tweets

## Services

| Service | Description |
|---------|-------------|
| `dice4me-web` | Next.js production server (VPS) |
| `dice4me-twitter` | Twitter filtered stream listener (VPS) |
| `dice4me-pi` | Pi server with servo + camera (Raspberry Pi) |

## License

[MIT](LICENSE)
