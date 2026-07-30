#!/bin/bash
# Discord Batch Export Script
# Usage: ./export-discord.sh

# === CONFIGURATION ===
TOKEN="YOUR_DISCORD_TOKEN_HERE"
OUTPUT_DIR="./discord-export"
FORMAT="Json"  # Json, Html, Csv, Txt

# === FORUM CHANNEL IDs ===
# Replace with your actual channel IDs
FORUM_CHANNELS=(
    "123456789012345678"  # 📚-bài-học
    "123456789012345679"  # ❓-hỏi-đáp
    "123456789012345680"  # 🏆-chia-sẻ
    "123456789012345681"  # 🔔-chung
)

# === CREATE OUTPUT DIR ===
mkdir -p "$OUTPUT_DIR"

# === EXPORT EACH FORUM ===
for CHANNEL_ID in "${FORUM_CHANNELS[@]}"; do
    echo "Exporting channel: $CHANNEL_ID"
    DiscordChatExporter.Cli export \
        --token "$TOKEN" \
        --channel "$CHANNEL_ID" \
        --format "$FORMAT" \
        --include-threads \
        --output "$OUTPUT_DIR"
done

echo "Export complete! Files saved to: $OUTPUT_DIR"
