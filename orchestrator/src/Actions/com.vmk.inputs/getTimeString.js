
var local_from_utc = 9;
var date = new Date();
date.setTime(date.getTime() + (local_from_utc * 3600000));
return System.formatDate(date, "YYYY-MM-dd HH:mm:ss");