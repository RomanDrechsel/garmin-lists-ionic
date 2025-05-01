package de.romandrechsel.lists.sysinfo;

import android.content.Context;
import android.util.DisplayMetrics;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "SysInfo")
public class SysInfoPlugin extends Plugin
{
    private static SysInfoPlugin _instance = null;

    private Boolean _isNightMode = null;

    SysInfoPlugin()
    {
        SysInfoPlugin._instance = this;
    }

    public static SysInfoPlugin GetInstance()
    {
        return SysInfoPlugin._instance;
    }

    private static final String TAG = "SysInfoPlugin";

    @PluginMethod
    public void DisplayDensity(PluginCall call)
    {
        Context context = this.getContext();
        DisplayMetrics metrics = context.getResources().getDisplayMetrics();
        float density = metrics.density;
        JSObject ret = new JSObject();
        ret.put("density", density);
        call.resolve(ret);
    }

    @PluginMethod
    public void NightMode(PluginCall call)
    {
        JSObject ret = new JSObject();
        ret.put("isNightMode", this._isNightMode);
        call.resolve(ret);
    }

    public void SetNightMode(@NonNull Boolean isNightMode)
    {
        if (this._isNightMode != isNightMode)
        {
            if (this._isNightMode != null)
            {
                //not at start...
                JSObject data = new JSObject();
                data.put("isNightMode", isNightMode);
                this.notifyListeners("NIGHTMODE", data);
            }
            this._isNightMode = isNightMode;
        }
    }
}
