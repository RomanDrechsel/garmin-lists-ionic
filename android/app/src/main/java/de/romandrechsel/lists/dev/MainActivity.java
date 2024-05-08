package de.romandrechsel.lists.dev;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.admob.AdMob;

import de.romandrechsel.lists.garmin.ConnectIQPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ConnectIQPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
