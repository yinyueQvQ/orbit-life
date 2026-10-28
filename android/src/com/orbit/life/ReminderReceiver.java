package com.orbit.life;
import android.app.*;
import android.content.*;
import android.os.Build;
import org.json.*;
public class ReminderReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context c,Intent intent){if(!c.getSharedPreferences("reminders",0).getBoolean("enabled",false))return;if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=android.content.pm.PackageManager.PERMISSION_GRANTED)return;
 String key=intent.getStringExtra("key");JSONArray items=ReminderScheduler.saved(c);JSONObject item=null;for(int n=0;n<items.length();n++)try{JSONObject o=items.getJSONObject(n);if(o.getString("key").equals(key))item=o;}catch(Exception ignored){}if(item==null)return;
 NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);NotificationChannel channel=new NotificationChannel("deadlines","截止日期提醒",NotificationManager.IMPORTANCE_HIGH);channel.setDescription("备忘、每日计划与目标的截止日期提醒");manager.createNotificationChannel(channel);
 Intent open=new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("open_notes",true);
 PendingIntent tap=PendingIntent.getActivity(c,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
 Notification notification=new Notification.Builder(c,"deadlines").setSmallIcon(com.orbit.life.R.drawable.icon).setContentTitle("星轨 · 事项到期提醒").setContentText(item.optString("title")).setStyle(new Notification.BigTextStyle().bigText(item.optString("title"))).setContentIntent(tap).setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();manager.notify(key.hashCode(),notification);
 }
}
