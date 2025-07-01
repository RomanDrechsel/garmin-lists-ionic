package de.romandrechsel.lists.sysinfo;

import android.content.Context;
import android.content.pm.PackageManager;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import de.romandrechsel.lists.logging.Logger;

@CapacitorPlugin(name = "SysInfo")
public class SysInfoPlugin extends Plugin
{
    private static final String TAG = "SysInfoPlugin";

    private Boolean _isNightMode = null;

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

    @PluginMethod
    public void Logcat(PluginCall call)
    {
        String level = call.getString("level", "n");
        String message = call.getString("message", null);
        if (message != null && level != null)
        {
            switch (level)
            {
                case "d":
                    Log.d(TAG, message);
                    break;
                case "i":
                    Log.w(TAG, message);
                    break;
                case "e":
                    Log.e(TAG, message);
                    break;
                case "n":
                default:
                    Log.i(TAG, message);
                    break;
            }
        }
    }

    @PluginMethod
    public void AppInstalled(PluginCall call)
    {
        String packageName = call.getString("packageName", null);

        boolean installed = false;
        if (packageName != null)
        {
            PackageManager pm = this.getContext().getPackageManager();
            try
            {
                pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
                installed = true;
                Logger.Debug(TAG, "App '" + packageName + "' is installed");
            }
            catch (PackageManager.NameNotFoundException e)
            {
                Logger.Debug(TAG, "App '" + packageName + "' is NOT installed");
            }
        }

        JSObject res = new JSObject();
        res.put("installed", installed);
        call.resolve(res);
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
