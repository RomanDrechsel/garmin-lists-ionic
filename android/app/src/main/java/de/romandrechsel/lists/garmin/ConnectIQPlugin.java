package de.romandrechsel.lists.garmin;

import android.app.Activity;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.garmin.android.connectiq.ConnectIQ;
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
public class ConnectIQPlugin extends Plugin {
    DeviceManager Manager;

    @Override
    public void load() {
        super.load();
        this.Manager = new DeviceManager(this);
        Logger.Plugin = this;
    }

    @PluginMethod
    public void Initialize(PluginCall call) {
        Activity activity = this.getActivity();
        if (activity != null) {
            this.Manager.Initialize(activity, call.getBoolean("live_devices", true), call.getBoolean("live_app", true));
        }
        this.emitJsEvent("INIT", new JSObject());
        call.resolve();
    }

    @PluginMethod
    public void OpenStore(PluginCall call) {
        this.Manager.openStore();
        call.resolve();
    }

    @PluginMethod
    public void OpenApp(PluginCall call) {
        Long device_id = HelperUtils.toLong(call.getString("device_id", null));
        boolean request = false;
        if (device_id != null) {
            request = this.Manager.openApp(device_id, (device, success) -> {
                JSObject event = new JSObject();
                event.put("app_opened", success);
                event.put("device", device.getDeviceIdentifier());
                this.emitJsEvent("APP_OPENED", event);
            });
        }

        JSObject ret = new JSObject();
        ret.put("request_send", request);
        call.resolve(ret);
    }

    @PluginMethod
    public void GetDevices(PluginCall call) {
        List<DeviceInfo> devices = this.Manager.getDevices(call.getBoolean("force_reload", false));
        call.resolve(this.toJSObject(devices));
    }

    @PluginMethod
    public void GetDevice(PluginCall call) {
        Long identifier = HelperUtils.toLong(call.getString("device_id", null));
        DeviceInfo device = this.Manager.getDevice(identifier);
        if (device != null) {
            call.resolve(device.toJSObject());
        } else {
            call.resolve();
        }
    }

    @PluginMethod
    public void SendToDevice(PluginCall call) {
        Long device_id = HelperUtils.toLong(call.getString("device_id", null));
        String json = call.getString("data", null);

        this.Manager.transmitToDevice(device_id, json, new DeviceManager.IMessageSendListener() {
            @Override
            public void onMessageStatus(@NonNull ConnectIQ.IQMessageStatus status) {
                JSObject ret = new JSObject();
                ret.put("success", status == ConnectIQ.IQMessageStatus.SUCCESS);
                call.resolve(ret);
            }

            @Override
            public void onMessageSendFailed(@Nullable DeviceInfo.DeviceState state) {
                JSObject ret = new JSObject();
                ret.put("success", false);
                call.resolve(ret);
            }
        });
    }

    public void emitJsEvent(String event, JSObject log) {
        this.notifyListeners(event, log);
    }

    private JSObject toJSObject(@NonNull List<DeviceInfo> devices) {
        ArrayList<JSObject> list = new ArrayList<>();
        for (DeviceInfo d : devices) {
            JSObject obj = d.toJSObject();
            if (obj != null) {
                list.add(obj);
            }
        }

        if (!list.isEmpty()) {
            JSObject ret = new JSObject();
            ret.put("devices", list);
            return ret;
        }

        return null;
    }
}
