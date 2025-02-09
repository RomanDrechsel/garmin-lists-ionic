package de.romandrechsel.lists.garmin;

import androidx.annotation.NonNull;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.List;

import de.romandrechsel.lists.logging.Logger;
import de.romandrechsel.lists.utils.HelperUtils;

@CapacitorPlugin(name = "ConnectIQ")
public class ConnectIQPlugin extends Plugin
{
    private static final String TAG = "ConnectIQPlugin";

    private DeviceManager Manager;

    @Override
    public void load()
    {
        super.load();
        this.Manager = new DeviceManager(this);
        Logger.Plugin = this;
    }

    @PluginMethod
    public void Initialize(PluginCall call)
    {
        this.Manager.Initialize(this.getActivity(), call.getBoolean("simulator", false), call.getBoolean("debug_app", false), new DeviceManager.IInitializeListener()
        {
            @Override
            public void Success(Boolean simulator, Boolean debug_app)
            {
                JSObject ret = new JSObject();
                ret.put("success", true);
                if (simulator)
                {
                    ret.put("simulator", true);
                }
                if (debug_app)
                {
                    ret.put("debug_app", true);
                }
                call.resolve(ret);
            }

            @Override
            public void Failed(String message)
            {
                JSObject ret = new JSObject();
                ret.put("success", false);
                ret.put("message", message);
                call.resolve(ret);
            }
        });
    }

    @PluginMethod
    public void OpenStore(PluginCall call)
    {
        this.Manager.openStore();
        call.resolve();
    }

    @PluginMethod
    public void OpenApp(PluginCall call)
    {
        Long device_id = HelperUtils.toLong(call.getString("device_id", null));
        boolean request = false;
        if (device_id != null)
        {
            request = this.Manager.openApp(device_id, (device, success) ->
            {
                JSObject event = new JSObject();
                event.put("app_opened", success);
                event.put("device", device != null ? device.getDeviceIdentifier() : null);
                this.emitJsEvent("APP_OPENED", event);
            });
        }

        JSObject ret = new JSObject();
        ret.put("request_send", request);
        call.resolve(ret);
    }

    @PluginMethod
    public void GetDevices(PluginCall call)
    {
        List<DeviceInfo> devices = this.Manager.getDevices(call.getBoolean("force_reload", false));
        call.resolve(this.toJSObject(devices));
    }

    @PluginMethod
    public void GetDevice(PluginCall call)
    {
        Long identifier = HelperUtils.toLong(call.getString("device_id", null));
        DeviceInfo device = this.Manager.getDevice(identifier);
        if (device != null)
        {
            call.resolve(device.toJSObject());
        }
        else
        {
            call.resolve();
        }
    }

    @PluginMethod
    public void SendToDevice(PluginCall call)
    {
        Long device_id = HelperUtils.toLong(call.getString("device_id", null));
        String message_type = call.getString("type", null);
        String json = call.getString("json", null);

        this.Manager.SendToDevice(device_id, message_type, json, (result, iq_status) ->
        {
            JSObject ret = new JSObject();
            ret.put("success", result == DeviceInfo.EMessageSendResult.Success);
            call.resolve(ret);
        });
    }

    public void emitJsEvent(String event, JSObject log)
    {
        this.notifyListeners(event, log);
    }

    private JSObject toJSObject(@NonNull List<DeviceInfo> devices)
    {
        ArrayList<JSObject> list = new ArrayList<>();
        for (DeviceInfo d : devices)
        {
            JSObject obj = d.toJSObject();
            if (obj != null)
            {
                list.add(obj);
            }
        }

        if (!list.isEmpty())
        {
            JSObject ret = new JSObject();
            ret.put("devices", list);
            return ret;
        }

        return null;
    }
}
