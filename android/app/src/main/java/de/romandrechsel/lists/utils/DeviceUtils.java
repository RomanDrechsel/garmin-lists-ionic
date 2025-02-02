package de.romandrechsel.lists.utils;

import androidx.annotation.NonNull;

import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.Map;

import de.romandrechsel.lists.garmin.DeviceMessageSerializeException;
import de.romandrechsel.lists.logging.Logger;

public class DeviceUtils
{
    private static final String TAG = "DeviceUtil";

    @NonNull
    public static ArrayList<String> MakeStringArray(@NonNull Object obj)
    {
        ArrayList<String> ret = new ArrayList<>();
        boolean error_occured = false;

        if (obj.getClass().isPrimitive())
        {
            ret.add(obj.toString());
        }
        else if (obj instanceof String)
        {
            ret.add((String) obj);
        }
        else if (obj instanceof ArrayList)
        {
            for (Object val : (ArrayList<Object>) obj)
            {
                try
                {
                    ret.add(DeviceUtils.MakeString(val));
                }
                catch (DeviceMessageSerializeException ex)
                {
                    error_occured = true;
                    Logger.Error(TAG, ex.getMessage());
                }
            }
        }
        else if (obj instanceof Map<?, ?> map)
        {
            for (Map.Entry<?, ?> entry : map.entrySet())
            {
                try
                {
                    var key = DeviceUtils.MakeString(entry.getKey());
                    var val = DeviceUtils.MakeString(entry.getValue());
                    if (!key.isEmpty())
                    {
                        ret.add(key + "=" + val);
                    }
                }
                catch (DeviceMessageSerializeException ex)
                {
                    Logger.Error(TAG, ex.getMessage());
                    error_occured = true;
                }
            }
        }

        if (error_occured)
        {
            ret.add(0, "error=true");
        }

        return ret;
    }

    @NotNull
    private static String MakeString(@NonNull Object obj) throws DeviceMessageSerializeException
    {
        if (obj.getClass().isPrimitive())
        {
            return obj.toString();
        }
        else if (obj instanceof String)
        {
            return (String) obj;
        }
        else
        {
            throw new DeviceMessageSerializeException("Could not serialize " + obj.getClass() + ": " + obj);
        }
    }
}
