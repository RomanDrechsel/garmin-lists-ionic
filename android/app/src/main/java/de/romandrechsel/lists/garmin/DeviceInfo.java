package de.romandrechsel.lists.garmin;

import android.util.Log;

import androidx.annotation.NonNull;

import com.garmin.android.connectiq.ConnectIQ;
import com.garmin.android.connectiq.IQApp;
import com.garmin.android.connectiq.IQDevice;
import com.garmin.android.connectiq.exception.InvalidStateException;
import com.garmin.android.connectiq.exception.ServiceUnavailableException;
import com.getcapacitor.JSObject;

public class DeviceInfo implements ConnectIQ.IQDeviceEventListener
{
    private static final String TAG = "DeviceInfo";
    public enum DeviceState { Initializing, Ready, AppNotInstalled, CheckingApp, NotConnected, ConnectionLost, NotPaired, InvalidState, ServiceUnavailable }

    @NonNull
    private final DeviceManager Manager;

    public IQDevice device;
    public IQApp deviceApp;
    @NonNull
    public DeviceState state = DeviceState.InvalidState;

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
                this.Manager.connectIQ.getApplicationInfo(DeviceManager.AppId, this.device, new ConnectIQ.IQApplicationInfoListener()
                {
                    @Override
                    public void onApplicationInfoReceived(IQApp iqApp)
                    {
                        DeviceInfo.this.setState(DeviceState.Ready);
                        DeviceInfo.this.deviceApp = iqApp;
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
            return ret;
        }

        return null;
    }

    private void setState(DeviceState state)
    {
        this.state = state;
        this.Manager.notifyDeviceStateChanged(this);
    }
}
