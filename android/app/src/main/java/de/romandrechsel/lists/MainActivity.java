package de.romandrechsel.lists;

import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

import de.romandrechsel.lists.garmin.ConnectIQPlugin;
import de.romandrechsel.lists.sysinfo.SysInfoPlugin;

public class MainActivity extends BridgeActivity
{
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        registerPlugin(ConnectIQPlugin.class);
        registerPlugin(SysInfoPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart()
    {
        super.onStart();
        WebView webView = getBridge().getWebView();
        if (webView != null)
        {
            webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
            webView.setVerticalScrollBarEnabled(true);
        }

        int currentNightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
        SysInfoPlugin.GetInstance().SetNightMode(currentNightMode == Configuration.UI_MODE_NIGHT_YES);
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig)
    {
        super.onConfigurationChanged(newConfig);
        boolean isNightMode;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R)
        {
            isNightMode = getResources().getConfiguration().isNightModeActive();
        }
        else
        {
            int currentNightMode = newConfig.uiMode & Configuration.UI_MODE_NIGHT_MASK;
            isNightMode = currentNightMode == Configuration.UI_MODE_NIGHT_YES;
        }
        SysInfoPlugin.GetInstance().SetNightMode(isNightMode);
    }
}
