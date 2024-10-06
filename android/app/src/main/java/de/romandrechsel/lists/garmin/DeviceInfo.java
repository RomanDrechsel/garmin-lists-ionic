package de.romandrechsel.lists.garmin;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.garmin.android.connectiq.ConnectIQ;
import com.garmin.android.connectiq.ConnectIQ.IQApplicationInfoListener;
import com.garmin.android.connectiq.IQApp;
import com.garmin.android.connectiq.IQDevice;
import com.garmin.android.connectiq.exception.InvalidStateException;
import com.garmin.android.connectiq.exception.ServiceUnavailableException;
import com.getcapacitor.JSObject;
import com.google.gson.Gson;
import com.google.gson.JsonSyntaxException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import de.romandrechsel.lists.logging.Logger;
import de.romandrechsel.lists.utils.DeviceUtils;

public class DeviceInfo implements ConnectIQ.IQDeviceEventListener, ConnectIQ.IQApplicationEventListener
{
    private static final String TAG = "Device";

    public enum DeviceState
    {Initializing, Ready, AppNotInstalled, CheckingApp, NotConnected, ConnectionLost, NotPaired, InvalidState, ServiceUnavailable}

    public enum EMessageSendResult
    {Success, NotSend, Timeout, Failed, DeviceNotFound, InvalidState, ServiceUnavailable, InvalidPayload}

    public interface IMessageSendListener
    {
        void onMessageSendResult(@NonNull EMessageSendResult result, @Nullable ConnectIQ.IQMessageStatus iq_status);
    }

    public interface IAppOpenedListener
    {
        void onAppOpenResponse(@Nullable DeviceInfo device, boolean success);
    }

    @NonNull
    private final DeviceManager Manager;

    public IQDevice device = null;
    public IQApp deviceApp = null;

    @NonNull
    public DeviceState state = DeviceState.NotConnected;

    public DeviceInfo(@NonNull IQDevice device, @NonNull DeviceManager manager)
    {
        this.Manager = manager;
        this.setDevice(device);
    }

    @Override
    public void onDeviceStatusChanged(IQDevice iqDevice, IQDevice.IQDeviceStatus iqDeviceStatus)
    {
        if (iqDeviceStatus == IQDevice.IQDeviceStatus.CONNECTED)
        {
            this.setState(DeviceState.CheckingApp);

            try
            {
                this.Manager.connectIQ.getApplicationInfo(DeviceManager.AppId, this.device, new IQApplicationInfoListener()
                {
                    @Override
                    public void onApplicationInfoReceived(IQApp iqApp)
                    {
                        DeviceInfo.this.deviceApp = iqApp;
                        DeviceInfo.this.setState(DeviceState.Ready);

                        try
                        {
                            DeviceInfo.this.Manager.connectIQ.registerForAppEvents(iqDevice, iqApp, DeviceInfo.this);
                        }
                        catch (InvalidStateException ex)
                        {
                            Logger.Error(TAG, "Could not register for app events, invalid state:", ex);
                            DeviceInfo.this.setState(DeviceState.InvalidState);
                        }
                    }

                    @Override
                    public void onApplicationNotInstalled(String s)
                    {
                        DeviceInfo.this.setState(DeviceState.AppNotInstalled);
                    }
                });
            }
            catch (InvalidStateException e)
            {
                Log.e(TAG, "ConnectIQ not in valid state!");
                this.setState(DeviceState.InvalidState);
            }
            catch (ServiceUnavailableException e)
            {
                Log.e(TAG, "ConnectIQ Service unavailable!");
                this.setState(DeviceState.ServiceUnavailable);
            }
        }
        else if (iqDeviceStatus == IQDevice.IQDeviceStatus.NOT_CONNECTED)
        {
            if (this.state == DeviceState.Ready)
            {
                this.setState(DeviceState.ConnectionLost);
            }
            else
            {
                this.setState(DeviceState.NotConnected);
            }
        }
        else
        {
            this.setState(DeviceState.NotPaired);
        }
    }

    @Override
    public void onMessageReceived(IQDevice iqDevice, IQApp iqApp, List<Object> list, ConnectIQ.IQMessageStatus iqMessageStatus)
    {
        if (iqDevice.getDeviceIdentifier() != this.getDeviceIdentifier() || !iqApp.getApplicationId().equals(this.deviceApp.getApplicationId()))
        {
            String device_string = iqDevice.getDeviceIdentifier() + " (" + iqDevice.getFriendlyName() + ")";
            Logger.Debug(TAG, "Received data from other device " + device_string + " - ignoring for device " + this);
            return;
        }

        if (iqMessageStatus != ConnectIQ.IQMessageStatus.SUCCESS || list == null)
        {
            Logger.Error(TAG, "Could not receive data from device " + this + ": " + iqMessageStatus.name());
        }
        else
        {
            Map<String, Object> data = (HashMap<String, Object>) list.get(0);
            if (data != null)
            {
                JSObject event_args = new JSObject();
                event_args.put("device", this.toJSObject());
                event_args.put("message", new Gson().toJson(data));
                this.Manager.Plugin.emitJsEvent("RECEIVE", event_args);
            }
        }
    }

    public void setDevice(IQDevice device)
    {
        this.disconnect();

        this.device = device;
        this.setState(DeviceState.Initializing);

        try
        {
            this.onDeviceStatusChanged(device, this.Manager.connectIQ.getDeviceStatus(device));
            this.Manager.connectIQ.registerForDeviceEvents(device, this);
        }
        catch (InvalidStateException e)
        {
            Log.e(TAG, "ConnectIQ not in valid state!");
            this.setState(DeviceState.InvalidState);
        }
        catch (ServiceUnavailableException e)
        {
            Log.e(TAG, "ConnectIQ Service unavailable!");
            this.setState(DeviceState.ServiceUnavailable);
        }
    }

    public void disconnect()
    {
        if (this.deviceApp != null)
        {
            try
            {
                this.Manager.connectIQ.unregisterForApplicationEvents(this.device, this.deviceApp);
            }
            catch (InvalidStateException e)
            {
                this.setState(DeviceState.InvalidState);
            }
            this.deviceApp = null;
        }

        if (this.device != null)
        {
            try
            {
                this.Manager.connectIQ.unregisterForDeviceEvents(this.device);
            }
            catch (InvalidStateException e)
            {
                this.setState(DeviceState.InvalidState);
            }
            this.device = null;
        }
    }

    /**
     * sends an object to a device
     *
     * @param payload      data object
     * @param sendListener listener for send success or failure
     */
    public void Send(@Nullable Object payload, @Nullable IMessageSendListener sendListener)
    {
        Map<String, Object> data;
        if (payload != null && !DeviceUtils.IsStringKeyMap(payload))
        {
            data = new HashMap<>();
            data.put("payload", payload);
        }
        else if (payload != null)
        {
            data = (Map<String, Object>) payload;
        }
        else
        {
            data = new HashMap<>();
        }

        this.transmitToDevice(data, sendListener);
    }

    /**
     * sends a json object to a device
     *
     * @param json         json data string
     * @param sendListener listener for send success or failure
     */
    public void SendJson(@Nullable String json, @Nullable IMessageSendListener sendListener)
    {
        if (json == null)
        {
            Logger.Error(TAG, "Could not send json to device " + this + ": no string provided");
            if (sendListener != null)
            {
                sendListener.onMessageSendResult(EMessageSendResult.InvalidPayload, null);
            }
        }
        Object obj;
        try
        {
            obj = new Gson().fromJson(json, Object.class);
        }
        catch (JsonSyntaxException ex)
        {
            Logger.Error(TAG, "Could not deserialize data: " + ex.getMessage());
            if (sendListener != null)
            {
                sendListener.onMessageSendResult(EMessageSendResult.InvalidPayload, null);
            }
            return;
        }
        this.Send(obj, sendListener);
    }

    /**
     * opens the lists app on the device
     *
     * @param listener listener if the app was open successful
     * @return true, if the request was send to the device, else false
     */
    public boolean openApp(@Nullable IAppOpenedListener listener)
    {
        if (this.device == null || this.deviceApp == null)
        {
            return false;
        }

        if (this.Manager.connectIQ != null && this.Manager.sdkReady)
        {
            try
            {
                this.Manager.connectIQ.openApplication(this.device, this.deviceApp, (device, app, status) ->
                {
                    boolean success = false;
                    if (status == ConnectIQ.IQOpenApplicationStatus.APP_IS_ALREADY_RUNNING || status == ConnectIQ.IQOpenApplicationStatus.PROMPT_SHOWN_ON_DEVICE)
                    {
                        success = true;
                        Logger.Debug(TAG, "Opened App on device " + this + ":", status);

                    }
                    else
                    {
                        Logger.Error(TAG, "Could not open app on device " + this + ":", status);
                    }
                    if (listener != null)
                    {
                        listener.onAppOpenResponse(this, success);
                    }
                });
                return true;
            }
            catch (InvalidStateException ex)
            {
                Logger.Error(TAG, "Could not open app on device " + this + ": invalid state", ex);
            }
            catch (ServiceUnavailableException ex)
            {
                Logger.Error(TAG, "Could not open app on device " + this + ": service unavailable", ex);
            }
        }
        else
        {
            Logger.Error(TAG, "Could not open app on device " + this + ": sdk not ready");
        }
        return false;
    }

    public long getDeviceIdentifier()
    {
        return this.device.getDeviceIdentifier();
    }

    public JSObject toJSObject()
    {
        if (this.device != null)
        {
            JSObject ret = new JSObject();
            ret.put("id", this.device.getDeviceIdentifier());
            ret.put("name", this.device.getFriendlyName());
            ret.put("state", this.state.name());
            ret.put("version", this.deviceApp != null ? this.deviceApp.version() : null);
            return ret;
        }

        return null;
    }

    @NonNull
    @Override
    public String toString()
    {
        return this.getDeviceIdentifier() + " (" + this.device.getFriendlyName() + ")";
    }

    private void setState(DeviceState state)
    {
        this.state = state;
        this.Manager.notifyDeviceStateChanged(this);
    }

    /**
     * transmits data to the device
     *
     * @param data     data map of type Map<String, Object>
     * @param listener listener for result
     */
    private void transmitToDevice(@NonNull Map<String, Object> data, @Nullable IMessageSendListener listener)
    {
        final Handler timeoutHandler = new Handler(Looper.getMainLooper());
        final boolean[] messageSent = {false};

        Runnable timeoutRunnable = () ->
        {
            if (!messageSent[0])
            {
                Logger.Error(TAG, "Timeout: Failed to transmit data to device " + this + " within 30 seconds");
                if (listener != null)
                {
                    listener.onMessageSendResult(EMessageSendResult.Timeout, null);
                }
            }
        };

        if (this.state == DeviceState.Ready)
        {
            try
            {
                Logger.Debug(TAG, "Trying to transmit data to device " + this + " ...");
                this.Manager.connectIQ.sendMessage(this.device, this.deviceApp, data, (device, app, status) ->
                {
                    messageSent[0] = true;
                    timeoutHandler.removeCallbacks(timeoutRunnable);
                    if (status == ConnectIQ.IQMessageStatus.SUCCESS)
                    {
                        Logger.Debug(TAG, "Transmitted data to device " + this);

                    }
                    else
                    {
                        Logger.Error(TAG, "Failed to transmit data to device " + this + ": " + status.name());
                    }

                    if (listener != null)
                    {
                        listener.onMessageSendResult(status == ConnectIQ.IQMessageStatus.SUCCESS ? EMessageSendResult.Success : EMessageSendResult.Failed, status);
                    }
                });
            }
            catch (InvalidStateException e)
            {
                Logger.Error(TAG, "Failed to transmit data to device " + this + ": Invalid state");
                if (listener != null)
                {
                    listener.onMessageSendResult(EMessageSendResult.InvalidState, null);
                }
            }
            catch (ServiceUnavailableException e)
            {
                Logger.Error(TAG, "Failed to transmit data to device " + this + ": Service unavailable");
                if (listener != null)
                {
                    listener.onMessageSendResult(EMessageSendResult.ServiceUnavailable, null);
                }
            }
            catch (Exception ex)
            {
                Logger.Error(TAG, "Failed to transmit data to device " + this + ": " + ex.getMessage());
                if (listener != null)
                {
                    listener.onMessageSendResult(EMessageSendResult.Failed, null);
                }
            }
        }
        else
        {
            Logger.Error(TAG, "Failed to transmit data to device " + this + ": Device is in state " + this.state);
            if (listener != null)
            {
                listener.onMessageSendResult(EMessageSendResult.Failed, ConnectIQ.IQMessageStatus.FAILURE_INVALID_DEVICE);
            }
        }
    }
}
