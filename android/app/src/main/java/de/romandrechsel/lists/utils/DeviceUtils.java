package de.romandrechsel.lists.utils;

import androidx.annotation.Nullable;

import java.util.Map;

public class DeviceUtils
{
    /**
     * checks if an object is of type Map<String, Object>
     *
     * @param obj object to be checked
     * @return returns the true, if it is of type Map<String, Object>, otherwise false
     */
    @Nullable
    public static boolean IsStringKeyMap(Object obj)
    {
        if (obj instanceof Map<?, ?> map)
        {
            boolean isStringObjectMap = true;
            for (Map.Entry<?, ?> entry : map.entrySet())
            {
                if (!(entry.getKey() instanceof String))
                {
                    isStringObjectMap = false;
                    break;
                }
            }

            return isStringObjectMap;
        }
        else
        {
            return false;
        }
    }
}
