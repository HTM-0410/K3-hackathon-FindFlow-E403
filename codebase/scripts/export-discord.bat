@echo off
REM Discord Batch Export Script for Windows
REM Usage: export-discord.bat

REM === CONFIGURATION ===
set TOKEN=YOUR_DISCORD_TOKEN_HERE
set OUTPUT_DIR=discord-export
set FORMAT=Json

REM === FORUM CHANNEL IDs ===
REM Replace with your actual channel IDs
set CHANNEL_1=123456789012345678
set CHANNEL_2=123456789012345679
set CHANNEL_3=123456789012345680
set CHANNEL_4=123456789012345681

REM === CREATE OUTPUT DIR ===
if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

REM === EXPORT EACH FORUM ===
echo Exporting channel 1...
DiscordChatExporter.Cli export --token "%TOKEN%" --channel "%CHANNEL_1%" --format %FORMAT% --include-threads --output "%OUTPUT_DIR%"

echo Exporting channel 2...
DiscordChatExporter.Cli export --token "%TOKEN%" --channel "%CHANNEL_2%" --format %FORMAT% --include-threads --output "%OUTPUT_DIR%"

echo Exporting channel 3...
DiscordChatExporter.Cli export --token "%TOKEN%" --channel "%CHANNEL_3%" --format %FORMAT% --include-threads --output "%OUTPUT_DIR%"

echo Exporting channel 4...
DiscordChatExporter.Cli export --token "%TOKEN%" --channel "%CHANNEL_4%" --format %FORMAT% --include-threads --output "%OUTPUT_DIR%"

echo.
echo Export complete! Files saved to: %OUTPUT_DIR%
pause
