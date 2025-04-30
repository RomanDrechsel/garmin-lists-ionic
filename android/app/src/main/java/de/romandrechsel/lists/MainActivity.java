package de.romandrechsel.lists;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

import de.romandrechsel.lists.garmin.ConnectIQPlugin;

public class MainActivity extends BridgeActivity
{
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        registerPlugin(ConnectIQPlugin.class);
        super.onCreate(savedInstanceState);
        this.requestSafeAreaInsets();
    }

    @Override
    public void onStart()
    {
        super.onStart();
        EdgeToEdge.enable(this);
        WebView webView = getBridge().getWebView();
        if (webView != null)
        {
            webView.setOverScrollMode(WebView.OVER_SCROLL_NEVER);
            // Register JS interface for hot-reload safe area request
            webView.addJavascriptInterface(this, "AndroidSafeArea");
        }
    }

    private void setSafeAreaInsets(int left, int top, int right, int bottom)
    {
        // Inject CSS variables into the WebView for Ionic safe areas
        String js = "document.documentElement.style.setProperty('--ion-safe-area-left', '" + left + "px');"
                + "document.documentElement.style.setProperty('--ion-safe-area-top', '" + top + "px');"
                + "document.documentElement.style.setProperty('--ion-safe-area-right', '" + right + "px');"
                + "document.documentElement.style.setProperty('--ion-safe-area-bottom', '" + bottom + "px');";
        getBridge().getWebView().evaluateJavascript(js, null);
    }

    @JavascriptInterface
    public void requestSafeAreaInsets()
    {
        Context context = bridge.getContext();
        if (context instanceof Activity activity)
        {
            activity.runOnUiThread(() ->
            {
                View rootView = activity.getWindow().getDecorView().getRootView();

                WindowInsetsCompat insets = ViewCompat.getRootWindowInsets(rootView);
                if (insets != null)
                {
                    Insets systemInsets = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                    Insets gestureInsets = insets.getInsets(WindowInsetsCompat.Type.systemGestures());
                    float density = this.getResources().getDisplayMetrics().density;

                    int leftInset = (int) (systemInsets.left / density);
                    int topInset = (int) (systemInsets.top / density);
                    int rightInset = (int) (systemInsets.right / density);
                    int bottomInset = (int) (Math.max(systemInsets.bottom, gestureInsets.bottom) / density);

                    if (insets.isVisible(WindowInsetsCompat.Type.ime()))
                    {
                        bottomInset = 0;
                    }

                    this.setSafeAreaInsets(leftInset, topInset, rightInset, bottomInset);
                }
            });
        }
    }
}
