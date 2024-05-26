#!/bin/bash
PACKAGE="de.romandrechsel.lists.dev"
NG="ng run"
if pgrep "$NG" >/dev/null; then
    pids=$(pgrep -l "$NG" | awk '{print $2}')
    echo "Beende Prozess(e) für '$NG': $pids"
    pkill -x "$NG"
fi
: '
echo "BUILDE APP:"
echo "--------------"
npx ng build --configuration=development && npx cap copy android
'

: '
echo "--------------"
echo "STARTE DEV SERVER:"
echo "--------------"

npx ionic serve --external --no-open --consolelogs --configuration=development --public-host:192.168.178.27 | tee ".scripts/serve_output.log" &


SERVE_PID=$!

# Warte, bis die spezifische Ausgabe erscheint
echo "Warte, bis der Entwicklungsserver läuft..."
while ! grep -q "Development server running!" ".scripts/serve_output.log"; do
  sleep 1
done
sleep 1

echo "STARTE APP:"
echo "--------------"
/home/roman/Android/Sdk/platform-tools/adb shell am force-stop $PACKAGE
/home/roman/Android/Sdk/platform-tools/adb shell am start -n $PACKAGE/$PACKAGE.MainActivity
echo "--------------"
'

npx ng build  --configuration=development && npx cap copy android && npx ionic cap run android --target=R5CW31K1TPT  --livereload --external --public-host=192.168.178.27
