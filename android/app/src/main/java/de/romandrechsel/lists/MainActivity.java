package de.romandrechsel.lists;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

import de.romandrechsel.lists.garmin.ConnectIQPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ConnectIQPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
