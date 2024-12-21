package de.romandrechsel.lists.garmin;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.garmin.android.connectiq.ConnectIQ;
import com.garmin.android.connectiq.IQDevice;
import com.garmin.android.connectiq.exception.InvalidStateException;
import com.garmin.android.connectiq.exception.ServiceUnavailableException;
import com.google.gson.Gson;
import com.google.gson.internal.LinkedTreeMap;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;

import de.romandrechsel.lists.logging.Logger;

public class DeviceManager implements ConnectIQ.ConnectIQListener
{
    @NonNull
    public ConnectIQPlugin Plugin;
    public ConnectIQ connectIQ;
    private static final String AppIdDebug = "64655bbc-555c-484d-827b-4aef68ff6f5e";
    private static final String AppIdRelease = "f9b0d002-4a4d-45ab-9330-bbed2c3af49f";
    public static String AppId = DeviceManager.AppIdRelease;

    private static final String TAG = "DeviceManager";
    public boolean sdkReady = false;

    private final List<DeviceInfo> devices = new ArrayList<>();

    public DeviceManager(@NonNull ConnectIQPlugin plugin)
    {
        this.Plugin = plugin;
    }

    public void Initialize(Activity activity, @Nullable Boolean live_devices, @Nullable Boolean live_app)
    {
        this.DisconnectAllDevices();

        if (live_app != null && live_app)
        {
            DeviceManager.AppId = DeviceManager.AppIdRelease;
        }
        else
        {
            DeviceManager.AppId = DeviceManager.AppIdDebug;
            Logger.Debug(TAG, "Using garmin debug app...");
        }

        if (live_devices != null && !live_devices)
        {
            //get debugging devices
            this.connectIQ = ConnectIQ.getInstance(activity, ConnectIQ.IQConnectType.TETHERED);
            this.connectIQ.setAdbPort(7381);
            Logger.Debug(TAG, "Initialize debug devices...");
        }
        else
        {
            //get live devices
            this.connectIQ = ConnectIQ.getInstance(activity, ConnectIQ.IQConnectType.WIRELESS);
        }
        this.connectIQ.initialize(activity, true, this);
    }

    @Override
    public void onSdkReady()
    {
        this.sdkReady = true;
        this.listDevices();
    }

    @Override
    public void onInitializeError(ConnectIQ.IQSdkErrorStatus errStatus)
    {
        Logger.Error("ConnectIQ", "ConnectIQ initialization failed: " + errStatus.toString());
        this.sdkReady = false;
        this.DisconnectAllDevices();
    }

    @Override
    public void onSdkShutDown()
    {
        this.sdkReady = false;
        this.DisconnectAllDevices();
    }

    /**
     * opens browser to the Garmin App-Store
     */
    public void openStore()
    {
        try
        {
            if (this.connectIQ != null)
            {
                this.connectIQ.openStore(AppId);
            }
        }
        catch (InvalidStateException | UnsupportedOperationException | ServiceUnavailableException ignored)
        {
        }
    }

    public boolean openApp(@NonNull Long deviceId, @Nullable DeviceInfo.IAppOpenedListener listener)
    {
        DeviceInfo device = this.getDevice(deviceId);
        if (device != null)
        {
            return device.openApp(listener);
        }
        else if (listener != null)
        {
            listener.onAppOpenResponse(null, false);
        }
        return false;
    }

    public void SendToDevice(@Nullable Long deviceId, @Nullable String json, @Nullable DeviceInfo.IMessageSendListener listener)
    {
        if (deviceId == null)
        {
            Logger.Error(TAG, "Could not send json to device, no device identifier provided");
            if (listener != null)
            {
                listener.onMessageSendResult(DeviceInfo.EMessageSendResult.DeviceNotFound, null);
            }
            return;
        }
        DeviceInfo device = this.getDevice(deviceId);
        if (device != null)
        {
            device.SendJson(json, listener);
            if (DeviceManager.IsDebug())
            {
                this.debugLogResponse(device, json);
            }
        }
        else if (listener != null)
        {
            listener.onMessageSendResult(DeviceInfo.EMessageSendResult.DeviceNotFound, null);
        }
    }

    /**
     * get all known devices
     *
     * @param force_reload reload device list
     * @return List of all known devices
     */
    public List<DeviceInfo> getDevices(Boolean force_reload)
    {
        if (this.devices.isEmpty() || force_reload)
        {
            this.listDevices();
        }

        return this.devices;
    }

    /**
     * gets information for a single device
     *
     * @param identifier unique identifier
     * @return DeviceInfo object
     */
    @Nullable
    public DeviceInfo getDevice(Long identifier)
    {
        if (this.sdkReady && identifier != null)
        {
            for (DeviceInfo d : this.devices)
            {
                if (d.getDeviceIdentifier() == identifier)
                {
                    return d;
                }
            }
        }
        return null;
    }

    /**
     * a device changed its state
     *
     * @param device the device
     */
    public void notifyDeviceStateChanged(DeviceInfo device)
    {
        this.Plugin.emitJsEvent("DEVICE", device.toJSObject());
    }

    /**
     * gets all known devices
     */
    private void listDevices()
    {
        this.DisconnectAllDevices();

        if (this.sdkReady)
        {
            try
            {
                List<IQDevice> devices = this.connectIQ.getKnownDevices();
                for (IQDevice d : devices)
                {
                    DeviceInfo info = this.getDevice(d.getDeviceIdentifier());
                    if (info == null)
                    {
                        info = new DeviceInfo(d, this);
                        this.devices.add(info);
                    }
                    else
                    {
                        info.setDevice(d);
                    }
                }
            }
            catch (InvalidStateException e)
            {
                Logger.Error(TAG, "ConnectIQ not in valid state!");
                this.DisconnectAllDevices();
            }
            catch (ServiceUnavailableException e)
            {
                Logger.Error(TAG, "ConnectIQ Service unavailable!");
                this.DisconnectAllDevices();
            }
        }

        Logger.Notice(TAG, this.devices.size() + " device(s) found");
    }

    /**
     * disconnects all devices
     */
    private void DisconnectAllDevices()
    {
        if (!this.devices.isEmpty())
        {
            for (DeviceInfo device : this.devices)
            {
                device.disconnect();
            }
            this.devices.clear();
        }
    }

    private static boolean IsDebug()
    {
        return DeviceManager.AppId.equals(DeviceManager.AppIdDebug);
    }

    private void debugLogResponse(DeviceInfo device, String json)
    {
        Object obj = new Gson().fromJson(json, Object.class);
        if (obj instanceof LinkedTreeMap)
        {
            LinkedTreeMap<String, Object> map = ((LinkedTreeMap<String, Object>) obj);
            if (map.containsKey("type"))
            {
                String type = (String) map.get("type");
                if (type != null && type.equals("request"))
                {
                    String request = map.containsKey("request") ? (String) map.get("request") : null;
                    Double tid = map.containsKey("tid") ? (Double) map.get("tid") : null;
                    if (request != null && request.equals("logs"))
                    {
                        new Handler(Looper.getMainLooper()).postDelayed(() ->
                        {
                            List<String> logs = Arrays.asList("Hallo", "Welt", "!");
                            HashMap<String, Object> data = new HashMap<>();
                            data.put("logs", logs);
                            data.put("tid", tid);
                            List<Object> list = List.of(data);
                            device.onMessageReceived(device.device, device.deviceApp, list, ConnectIQ.IQMessageStatus.SUCCESS);
                        }, 10000);
                    }
                }
            }
        }
    }
}
