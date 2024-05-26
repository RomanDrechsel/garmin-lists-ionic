#!/bin/bash

# Funktion, um die Geräte-ID zu ermitteln
select_device() {
    output=$(npx ionic cap run android --list)
    real_device_id=""
    highest_api=0
    emulator_id=""
    start_parsing=false

    while IFS= read -r line; do
        if [[ "$line" == "----"* ]]; then
            start_parsing=true
            continue
        fi

        if [ "$start_parsing" = true ]; then
            if ! echo "$line" | grep -q "(emulator)"; then
                real_device_id=$(echo "$line" | awk '{print $7}')
                break
            else
                api=$(echo "$line" | awk '{print $4}')
                id=$(echo "$line" | awk '{print $7}')

                echo "$api -- $id"

                if [ "$api" -gt "$highest_api" ]; then
                    highest_api=$api
                    emulator_id=$id
                fi
            fi
        fi
    done <<< "$output"

    if [ -n "$real_device_id" ]; then
        device_id="$real_device_id"
    else
        if [ -n "$emulator_id" ]; then
            device_id="$emulator_id"
        else
            echo "Kein echtes Gerät und kein Emulator gefunden."
            exit 1
        fi
    fi

    echo "$device_id"
}

echo "Gerät gefunden: "
echo $(select_device)
