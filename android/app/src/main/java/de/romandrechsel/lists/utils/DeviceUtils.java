package de.romandrechsel.lists.utils;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.gson.JsonObject;
import com.google.gson.JsonPrimitive;

import org.jetbrains.annotations.NotNull;

import java.util.ArrayList;
import java.util.List;
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
        else if (obj instanceof JsonObject json)
        {
            for (Map.Entry<?, ?> entry : json.entrySet())
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
        else if (obj instanceof JsonPrimitive prim)
        {
            ret.add(prim.getAsString());
        }

        if (error_occured)
        {
            ret.add(0, "error=true");
        }

        return ret;
    }

    @NotNull
    private static String MakeString(@Nullable Object obj) throws DeviceMessageSerializeException
    {
        if (obj == null)
        {
            return "";
        }

        if (obj instanceof JsonPrimitive prim)
        {
            return prim.getAsString();
        }

        Class<?> obj_class = obj.getClass();
        ArrayList<Class<?>> check = new ArrayList<>(List.of(
                Long.class,
                Double.class,
                Integer.class,
                Float.class,
                Character.class,
                Short.class
        ));
        if (obj_class.isPrimitive() || check.contains(obj_class))
        {
            return String.valueOf(obj);
        }
        else if (obj_class == Boolean.class)
        {
            if ((boolean) obj)
            {
                return "true";
            }
            else
            {
                return "false";
            }
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
