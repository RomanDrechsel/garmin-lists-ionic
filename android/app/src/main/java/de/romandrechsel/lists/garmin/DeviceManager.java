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
import com.google.gson.JsonSyntaxException;

import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.List;

import de.romandrechsel.lists.logging.Logger;

public class DeviceManager implements ConnectIQ.ConnectIQListener
{
    public interface IMessageSendListener
    {
        void onMessageStatus(@NonNull ConnectIQ.IQMessageStatus status);

        void onMessageSendFailed(@Nullable DeviceInfo.DeviceState state);
    }

    public interface IAppOpenedListener
    {
        void onAppOpenResponse(@NotNull DeviceInfo device, boolean success);
    }

    @NonNull
    public ConnectIQPlugin Plugin;
    public ConnectIQ connectIQ;
    private static final String AppIdDebug = "64655bbc-555c-484d-827b-4aef68ff6f5e";
    private static final String AppIdRelease = "f9b0d002-4a4d-45ab-9330-bbed2c3af49f";
    public static String AppId = DeviceManager.AppIdRelease;

    private static final String TAG = "DeviceManager";
    private boolean sdkReady = false;

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
        } else
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
        } else
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
        } catch (InvalidStateException | UnsupportedOperationException | ServiceUnavailableException ignored)
        {
        }
    }

    public boolean openApp(Long deviceId, @Nullable IAppOpenedListener listener)
    {
        if (this.connectIQ != null && this.sdkReady)
        {
            DeviceInfo device = this.getDevice(deviceId);
            if (device != null)
            {
                try
                {
                    this.connectIQ.openApplication(device.device, device.deviceApp, (device1, app, status) ->
                    {
                        boolean success = false;
                        if (status == ConnectIQ.IQOpenApplicationStatus.APP_IS_ALREADY_RUNNING || status == ConnectIQ.IQOpenApplicationStatus.PROMPT_SHOWN_ON_DEVICE)
                        {
                            success = true;
                            Logger.Debug(TAG, "Opened App on device " + device + ":", status);

                        } else
                        {
                            Logger.Error(TAG, "Could not open app on device " + device + ":", status);
                        }
                        if (listener != null)
                        {
                            listener.onAppOpenResponse(device, success);
                        }
                    });
                    return true;
                } catch (InvalidStateException ex)
                {
                    Logger.Error(TAG, "Could not open app on device " + deviceId + ": invalid state", ex);
                } catch (ServiceUnavailableException ex)
                {
                    Logger.Error(TAG, "Could not open app on device " + deviceId + ": service unavailable", ex);
                }
            } else
            {
                Logger.Error(TAG, "Could not open app on device " + deviceId + ": device not found.");
            }
        }
        return false;
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
     * transmits data to the device
     *
     * @param identifier unique device identifier
     * @param json       json data string
     * @param listener   listener for result
     */
    public void transmitToDevice(@Nullable Long identifier, @Nullable String json, @NonNull IMessageSendListener listener)
    {
        if (identifier == null)
        {
            Logger.Error(TAG, "Failed to transmit list to device: no identifier");
            listener.onMessageSendFailed(null);
            return;
        }

        //final long identifier = tmp;
        Object obj;
        try
        {
            Gson gson = new Gson();
            obj = gson.fromJson(json, Object.class);
        } catch (JsonSyntaxException ex)
        {
            Logger.Error(TAG, "Could not deserialize list: " + ex.getMessage());
            listener.onMessageSendFailed(null);
            return;
        }

        final Handler timeoutHandler = new Handler(Looper.getMainLooper());
        final boolean[] messageSent = {false};

        Runnable timeoutRunnable = () ->
        {
            if (!messageSent[0])
            {
                Logger.Error(TAG, "Timeout: Failed to transmit list to device " + identifier + " within 30 seconds");
                listener.onMessageSendFailed(DeviceInfo.DeviceState.ServiceUnavailable);
            }
        };

        try
        {
            DeviceInfo send_to_device = this.getDevice(identifier);
            if (send_to_device != null && send_to_device.state == DeviceInfo.DeviceState.Ready)
            {
                Logger.Debug(TAG, "Trying to transmit list to device " + identifier + " ...");
                this.connectIQ.sendMessage(send_to_device.device, send_to_device.deviceApp, obj, (device, app, status) ->
                {
                    messageSent[0] = true;
                    timeoutHandler.removeCallbacks(timeoutRunnable);
                    if (status == ConnectIQ.IQMessageStatus.SUCCESS)
                    {
                        Logger.Debug(TAG, "Transmitted list to device " + identifier);
                    } else
                    {
                        Logger.Error(TAG, "Failed to transmit list to device: " + status.name());
                    }
                    listener.onMessageStatus(status);
                });
            } else if (send_to_device != null)
            {
                Logger.Error(TAG, "Failed to transmit list to device " + identifier + ": Device is in state " + send_to_device.state);
                listener.onMessageSendFailed(DeviceInfo.DeviceState.InvalidState);
            } else
            {
                Logger.Error(TAG, "Failed to transmit list to device " + identifier + ": Device not found");
                listener.onMessageSendFailed(null);
            }
        } catch (InvalidStateException e)
        {
            Logger.Error(TAG, "Failed to transmit list to device: Invalid state");
            listener.onMessageSendFailed(DeviceInfo.DeviceState.InvalidState);
        } catch (ServiceUnavailableException e)
        {
            Logger.Error(TAG, "Failed to transmit list to device: Service unavailable");
            listener.onMessageSendFailed(DeviceInfo.DeviceState.ServiceUnavailable);
        } catch (Exception ex)
        {
            Logger.Error(TAG, "Failed to transmit list to device: " + ex.getMessage());
            listener.onMessageSendFailed(null);
        }
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
                    } else
                    {
                        info.setDevice(d);
                    }
                }
            } catch (InvalidStateException e)
            {
                Logger.Error(TAG, "ConnectIQ not in valid state!");
                this.DisconnectAllDevices();
            } catch (ServiceUnavailableException e)
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
}
