package de.romandrechsel.lists.sysinfo;

import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.DisplayMetrics;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;

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
        Boolean silent = call.getBoolean("silent", null);

        boolean installed = false;
        if (packageName != null)
        {
            PackageManager pm = this.getContext().getPackageManager();
            try
            {
                pm.getPackageInfo(packageName, PackageManager.GET_ACTIVITIES);
                installed = true;
                if (silent == null || !silent)
                {
                    Logger.Debug(TAG, "App '" + packageName + "' is installed");
                }
            }
            catch (PackageManager.NameNotFoundException e)
            {
                if (silent == null || !silent)
                {
                    Logger.Debug(TAG, "App '" + packageName + "' is NOT installed");
                }
            }
        }

        JSObject res = new JSObject();
        res.put("installed", installed);
        call.resolve(res);
    }

    @PluginMethod
    public void SendExportToListago(PluginCall call)
    {
        JSObject ret = new JSObject();
        String filePath = call.getString("zip");
        if (filePath == null)
        {
            ret.put("success", false);
            Logger.Error(TAG, "Could not export to Listago app: missing parameter 'zip'");
        }
        else
        {
            if (filePath.startsWith("file://"))
            {
                filePath = filePath.substring(7);
            }
            Context context = this.getContext();
            File file = new File(filePath);

            if (!file.exists())
            {
                ret.put("success", false);
                Logger.Error(TAG, "Could not export to Listago app: file not found '" + file.getAbsolutePath() + "'");
            }
            else
            {
                Uri uri = FileProvider.getUriForFile(context, context.getPackageName() + ".fileprovider", file);

                Intent intent = new Intent(Intent.ACTION_SEND);
                intent.setType("application/zip");
                intent.putExtra(Intent.EXTRA_STREAM, uri);
                intent.putExtra("request", "export-from-lists");

                if (Boolean.TRUE.equals(call.getBoolean("dev", false)))
                {
                    intent.setComponent(new ComponentName("de.romandrechsel.listago.dev", "de.romandrechsel.listago.MainActivity"));
                }
                else
                {
                    intent.setComponent(new ComponentName("de.romandrechsel.listago", "de.romandrechsel.listago.MainActivity"));
                }

                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

                context.startActivity(intent);
                ret.put("success", true);
                Logger.Notice(TAG, "Export of '" + uri.getPath() + "' to Listago app successful");
            }
        }

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
