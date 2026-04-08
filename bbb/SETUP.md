# BeagleBone White Setup

## 1. Prerequisites (BeagleBone Debian)

```bash
# Update system
sudo apt update && sudo apt install -y python3-pip ffmpeg curl

# Install Adafruit_BBIO for PWM/GPIO
sudo pip3 install Adafruit_BBIO --break-system-packages

# Install Node.js 20 (ARM build)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install tsx globally
sudo npm install -g tsx
```

## 2. Copy Project

```bash
mkdir -p ~/dice4me
# From VPS:
scp -r root@89.167.127.16:/home/dice4me/bbb/* ~/dice4me/
cd ~/dice4me
npm install
```

## 3. Configure Environment

```bash
cat > .env << 'EOF'
DICE4ME_API_KEY=a7ee96f888ee32cab54cacfa00635a7bcc2e719f50bc69843afbb771a927ddec
PORT=3001
SERVO_PIN=P9_14
PHOTO_CAM=/dev/video0
STREAM_CAM=/dev/video0
EOF
```

## 4. Hardware Wiring

- Servo signal → **P9_14** (PWM)
- Servo VCC → **P9_7** (5V) or external 5V supply
- Servo GND → **P9_1** or **P9_2** (GND)
- USB webcam → USB host port

## 5. Test Servo

```bash
sudo python3 -c "
import Adafruit_BBIO.PWM as PWM
import time
PWM.start('P9_14', 7.5, 50)
time.sleep(2)
PWM.stop('P9_14')
PWM.cleanup()
"
```

## 6. Run

```bash
cd ~/dice4me
sudo tsx src/index.ts
```

## 7. Auto-start with systemd

```bash
sudo cp dice4me-bbb.service /etc/systemd/system/dice4me-pi.service
sudo systemctl daemon-reload
sudo systemctl enable dice4me-pi
sudo systemctl start dice4me-pi
sudo systemctl status dice4me-pi
```

## Notes

- BeagleBone White only has 256MB RAM. Node.js + tsx will use ~100MB. Camera streaming may be tight.
- Consider running ffmpeg at lower resolution (`640x480` instead of `1280x720`) for better performance.
- Adafruit_BBIO requires root for PWM access.
