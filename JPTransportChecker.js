var time = {};
var late = false;


// SETTINGS ==================================================

// チェック対象の路線名。コンマ区切りで複数路線チェック可能 || Name of transport (Comma separated)
var transport_name = '埼京,湘南新宿,高崎線,東海道,京浜東北';

// チェック開始時刻 || Time to Start Checking
time.start_hour = '08';
time.start_minute = '00';

// チェック終了時刻 || Time to End Checking
time.end_hour = '09';
time.end_minute = '00';

// チェック間隔(分) || Check Interval (minute)
time.interval = 10;

// チェックする曜日 || A day of the week want to check.
check_days = {
    'mon'   : true,
    'tue'   : true,
    'wed'   : true,
    'thu'   : true,
    'fri'   : true,
    'sat'   : false,
    'sun'   : false
};

// 遅延を発見したらそれ以降のアラームを停止する || Stop alarm if late found.
var stop_alarm_if_late_found = false;    // Set 'true' if you want to stop checking.

// 遅延時、ジョルダンライブのPCでなくモバイルサイトへ移動する || Go to jorudan PC page or MOBILE page.
var go_to_mobile_site = false;      // Set 'true' if you want to go to mobile page.

// END OF SETTING ========================================================


var jorudan = 'http://eki.jorudan.co.jp/unk/live.html';
var mobile_site = 'http://live-j.jp';

var message = {};
message.check_ok = '異常無し';
message.check_ng = '(注意) 遅れが発生しているようです。';
message.unknown_error = 'チェックエラー - %s';
message.base_notification = '交通情報';

var notification = device.notifications.createNotification(message.base_notification);

var getDateObject = function(unixtime){
    var d = new Date();
    return d.setTime(unixtime);
};

var days_list = [
    check_days.sun,
    check_days.mon,
    check_days.tue,
    check_days.wed,
    check_days.thu,
    check_days.fri,
    check_days.sat
];

var interval = 60000 * time.interval;
var now = new Date();
var year = now.getFullYear();
var month = now.getMonth();
var day = now.getDate();

var timeStart = new Date(year, month, day, time.start_hour, time.start_minute);
var timeEnd = new Date(year, month, day, time.end_hour, time.end_minute);
var timeSnooze = interval+timeStart.getTime();

var check = function(){
    var arr = transport_name.split(',');
    var len = arr.length;

    device.ajax(
    {
        url: jorudan,
        type: 'GET',
        headers: {
            'Content-Type': 'application/text'
        }
    },
    function onSuccess(body, textStatus, response){
        var error = false;
        for(var i=0;i<len;i++){
            if (body.indexOf(arr[i]) != -1){
                error = true;
            }
        }

        if(error){
            notification.content = message.check_ng;
            notification.show();

            if(stop_alarm_if_late_found){
                late = true;
                stopAlarm();
            }
        }

        notification.on(
            'click',
            function(){
                var url = jorudan;
                if (go_to_mobile_site) url = mobile_site;

                device.browser.launch(url);
            }
        );
    },
    function onError(textStatus, response){

        var error = textStatus +' (' +response.status +')';
        notification.content = message.base_notification +message.unknown_error.replace('%s', error);
        notification.show();
    });
};

var is_valid_day = function(){
    var today = new Date();
    return days_list[today.getDay()];
};

var snooze = function(){
    if(! is_valid_day()){
        return;
    }

    device.scheduler.setTimer({
        name    : 'Checker',
        time    : timeStart.getTime(),
        interval: interval,
        exact   : true
    }, check);
};

var stopAlarm = function(){
    device.scheduler.removeTimer("Checker");
    console.log('stopped by stopAlarm()');
};

device.scheduler.setTimer({
      name: "dailyCheck", 
      time: timeStart.getTime(),
      interval: 'day',
      exact: true
}, function (){
    late = false;
    snooze();
});

device.scheduler.setTimer({
    name    : 'StopInterval',
    time    : timeEnd.getTime(),
    interval: 'day',
    exact   : true
}, function(){
    if(is_valid_day() && !late){
        device.scheduler.removeTimer("Checker");
        console.log('Daily Alarm Stopped!');
    }
});

log = 'Checking will start at ' +time.start_hour +':' +time.start_minute +'\n';
log += 'Stop at ' +time.end_hour +':' +time.end_minute +'\n';
log += 'Interval ' +time.interval +' minutes';
console.info(log);
