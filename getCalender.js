'use util'


// main処理
//-------------------------------------------------------------------
function myFunction() {
  // メイン処理でエラーが出たとき用
  Logger.log("=====================start====================" )
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  try{
    var ids = getIds(spreadsheet);       //スプレッドシートにある管理対象のインスタンス
    var users = getUsers(spreadsheet);   //スプレッドシートにあるカレンダーチェック対象のユーザー
    manageInstance(users,ids,1)
    mappingIdState(spreadsheet,1);  
  } catch(e){
    var err = "エラーの内容:" + e;
    Logger.log(err);
  }
  
  
  Logger.log("=====================end====================" )
  
  // ログ出力
  var logSheet = spreadsheet.getSheetByName('log');
  var myLog = Logger.getLog();
  logSheet.getRange(1, 1).setValue(myLog);
}

function dryRun() {
  // メイン処理でエラーが出たとき用
  Logger.log("=====================DryRun Start====================" )
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  try{
    var ids = getIds(spreadsheet);       //スプレッドシートにある管理対象のインスタンス
    var users = getUsers(spreadsheet);   //スプレッドシートにあるカレンダーチェック対象のユーザー
    manageInstance(users,ids,0)
    mappingIdState(spreadsheet,0);
  } catch(e){
    var err = "エラーの内容:" + e;
    Logger.log(err);
  }
  Logger.log("=====================DryRun End====================" )
  
  // ログ出力
  var logSheet = spreadsheet.getSheetByName('log');
  var myLog = Logger.getLog();
  logSheet.getRange(1, 1).setValue(myLog);
}

//-------------------------------------------------------------------
// get UserId for check schedule
function getUsers(spreadsheet) {
  var sheet = spreadsheet.getSheetByName('manage');
  var users = [];
    
  i=1
  do {
    i += 1;
    var mail  = sheet.getRange(i, 2).getValue();
    if (mail != "") {
      users.push(mail);
      Logger.log("add Target user:" + mail );      
    }
  } while (sheet.getRange(i, 2).getValue() != "" ); 
  return users;
}
//-------------------------------------------------------------------
// get managed instance ids 
function getIds(spreadsheet) {  
  var sheet = spreadsheet.getSheetByName('manage');
  var ids = [];
  
  i=1
  do {
    i += 1;
    
    var flg = sheet.getRange(i, 5).getValue();
    var id  = sheet.getRange(i, 3).getValue();
    //管理票の管理対象インスタンスのみを取得する
    if (flg){
      if (id != "") {
        ids.push(id);
        Logger.log("add Target id:" + id);      
      }
    } else {
      if (id != "") {
        Logger.log("found instance id:" + id + " do not check. because flag is false");      
      }
    }
    
  } while (sheet.getRange(i, 3).getValue() != "" ); 
  return ids;
}
// state check 
function mappingIdState(spreadsheet,mode) {  
  var sheet = spreadsheet.getSheetByName('manage');
  Logger.log("dryRun is " + mode)
  
  i=1
  do {
    i += 1;
    var id  = sheet.getRange(i, 3).getValue();
    //管理票の管理対象インスタンスのみを取得する
    if (id != "") {
      var state = checkInstanceState(id)
      if (mode){
        sheet.getRange(i, 6).setValue(state);
      } else {
        sheet.getRange(i, 6).setValue("DryRun:" + state);
      }
    }    
  } while (sheet.getRange(i, 3).getValue() != "" ); 
}

//-------------------------------------------------------------------
// Matching scheduled instances and managed instances
function manageInstance(users,ids,doFlg) {
  var tartgetIds = []  //カレンダーに登録されているID
  var now = new Date();    

  // 無限ループ回避案
  var userCount = 0;
  do {
    var targetUser = users[userCount];
    Logger.log("get schedule of " + targetUser);  
    //ここでnullが返ってくる
    var cal = CalendarApp.getCalendarById(targetUser.trim());
    if(cal != null){
    // 5分前～1分前
      var Events = cal.getEvents(new Date(now.getTime()), new Date(now.getTime()+(1 * 1000)));
      if (Events.length != 0){
        // カレンダーイベントからインスタンスIDを取得する
        var title = getInstanceIds(Events);  
        if (title.length != 0){
          // 取得できたインスタンスを突合用のリストに入れる
          for (var j= 0, titleLength = title.length; j < titleLength; j+=1) {
            Logger.log("got instance id from calender event. id:" + title[j] ); 
            tartgetIds.push(title[j]);
          }
        } 
      }
    }    
    userCount += 1;
  } while (userCount < users.length); 
   
  
  if (tartgetIds.length == 0){
    Logger.log("there is no scheduled instance.");
  } else {
    Logger.log("scheduled instances are " + tartgetIds.length);
    Logger.log("scheduled ids:");
    for (var i = 0, targetIdsLength = tartgetIds.length; i < targetIdsLength; i+=1){
      Logger.log("  " + tartgetIds[0]);
    }
  }

  if (doFlg){
    //-------------------------------------------------------------------
    // for normal run
    //-------------------------------------------------------------------
    for (var i = 0, targetIdsLength = tartgetIds.length; i < targetIdsLength; i+=1) {
      if(ids.indexOf(tartgetIds[i]) >= 0){
        // 管理対象がカレンダーにあるとき
        funcInstance(tartgetIds[i],"start");
      } else {
        // 管理対象ではないものがカレンダーにあるとき
        Logger.log(tartgetIds[i] + " is not managed.");
      }
    }
    for (var i = 0, idsLength = ids.length; i < idsLength; i+=1) {
      if(tartgetIds.indexOf(ids[i]) >= 0){
        //カレンダーにある管理対象のもの→何もしない
      } else {
        //カレンダーにない、かつ管理対象のもの
        funcInstance(ids[i],"stop");
      }
    } 
  } else {
    //-------------------------------------------------------------------
    //for dry run
    //-------------------------------------------------------------------
    for (var i = 0, targetIdsLength = tartgetIds.length; i < targetIdsLength; i+=1) {
      if(ids.indexOf(tartgetIds[i]) >= 0){
        //管理対象がカレンダーにあるとき
        Logger.log(tartgetIds[i] + " will start ");
      } else {
        // 管理対象ではないものがカレンダーにあるとき
        Logger.log(tartgetIds[i] + " is not managed.");
      }
    }
    for (var i = 0, idsLength = ids.length; i < idsLength; i+=1) {
      if(tartgetIds.indexOf(ids[i]) >= 0){
        //カレンダーにある管理対象のもの→何もしない
      } else {
        //カレンダーにない、かつ管理対象のもの
        Logger.log(ids[i] + " will stop");
      }
    } 
  }
}
//-------------------------------------------------------------------
// Control instance with "start","stop" and get "state"
function funcInstance(id,action){
  if (action != "start" &&
      action != "stop" &&
      action != "state"){
    return 1;
  }
  if (id == "" ){
    return 1;
  }
//  Logger.log("call api action " + action + " for instance id:" + id );   
  var options =
  {
    "method" : "get"
  };
  var url = "https://ドメイン/prod/ec2/" + id + "/" + action
  response = UrlFetchApp.fetch(url, options);
  Logger.log(" result --> " + response);
}

//-------------------------------------------------------------------
// Get instance "state"
function checkInstanceState(id){
  var action = "state"
  
  if (id == "" ){
    return 1;
  }
  var options =
  {
    "method" : "get"
  };
  var url = "https://ドメイン/prod/ec2/" + id + "/" + action
  var response = UrlFetchApp.fetch(url, options);
  return response;
}

// get instanceId that start with "i-" from argument string
function getInstanceIds(sched){
  var ids = [];
  for (i = 0, eventsLength = sched.length; i < eventsLength; i+=1) {
    var title = sched[i].getTitle();
    if (title.indexOf("i-") >= 0) {
      ids.push(title.trim());
    }
  }
  return ids;
}
