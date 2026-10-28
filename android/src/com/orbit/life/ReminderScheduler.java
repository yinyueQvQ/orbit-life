package com.orbit.life;
import android.app.*;
import android.content.*;
import android.net.Uri;
import org.json.*;
final class ReminderScheduler {
 static PendingIntent pending(Context c,String key){Intent i=new Intent(c,ReminderReceiver.class).setData(Uri.parse("orbit://reminder/"+Uri.encode(key))).putExtra("key",key);return PendingIntent.getBroadcast(c,0,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static JSONArray saved(Context c){try{return new JSONArray(c.getSharedPreferences("reminders",0).getString("items","[]"));}catch(Exception e){return new JSONArray();}}
 static void update(Context c,String raw){try{JSONArray next=new JSONArray(raw);if(next.length()>128)return;for(int n=0;n<next.length();n++){JSONObject o=next.getJSONObject(n);if(o.getString("key").length()>180||o.getString("title").length()>120||o.getLong("at")<0)return;}AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);JSONArray old=saved(c);for(int n=0;n<old.length();n++){String key=old.getJSONObject(n).getString("key");boolean keep=false;for(int k=0;k<next.length();k++)if(next.getJSONObject(k).getString("key").equals(key)&&next.getJSONObject(k).getLong("at")==old.getJSONObject(n).getLong("at"))keep=true;if(!keep)a.cancel(pending(c,key));}c.getSharedPreferences("reminders",0).edit().putString("items",next.toString()).apply();restore(c);}catch(Exception ignored){}}
 static void restore(Context c){if(!c.getSharedPreferences("reminders",0).getBoolean("enabled",false))return;AlarmManager a=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);JSONArray list=saved(c);long now=System.currentTimeMillis();for(int n=0;n<list.length();n++)try{JSONObject o=list.getJSONObject(n);long at=o.getLong("at");if(at>now)a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c,o.getString("key")));}catch(Exception ignored){}}
 static void clear(Context c){update(c,"[]");((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).cancelAll();}
}
