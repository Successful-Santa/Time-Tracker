const tabTimeObjectKey = "tabTimeObject";//{key:url,value:{url:string, trackedSeconds:number, lastDateVal:number, }}
const lastActiveTabKey = "lastActiveTab"; //{url:string,lastDateVal:number}


chrome.runtime.onInstalled.addListener(function() { 
  chrome.declarativeContent.onPageChanged.removeRules(undefined, function() {
      chrome.declarativeContent.onPageChanged.addRules([{
          conditions: [new chrome.declarativeContent.PageStateMatcher({
              pageUrl: {hostContains: '.'},
          })],
          actions: [new chrome.declarativeContent.ShowPageAction()]
      }]);
  });
});


chrome.windows.onFocusChanged.addListener(function(windowId){
  if (windowId==chrome.windows.WINDOW_ID_NONE)
    processTabChange(false);
  else{
    processTabChange(true);
  }
})

function processTabChange(isWindowsActive)
{
    chrome.tabs.query({"active":true}, function(tabs) {
      
      console.log("isWindowsActive:"+ isWindowsActive);
      console.log(tabs);
      if (tabs.length > 0 && tabs[0] != null){
        let currentTab = tabs[0];
        let url = currentTab.url;
        let title = currentTab.title;
        let hostName=url;
        try{
          let urlObject=new URL(url);
          hostName = urlObject.hostname;
        } catch(e){
            console.log('could not construct url from ${currentTab.url,e') //doubt
        }

        chrome.storage.local.get([tabTimeObjectKey, lastActiveTabKey],function(result){
          let lastActiveTabString = result[lastActiveTabKey];
          let tabTimeObjectString = result[tabTimeObjectKey];
          console.log("background.js,result:");
          console.log(result);
          let tabTimeObject = {};
          if( tabTimeObjectString != null)
            tabTimeObject= JSON.parse(tabTimeObjectString);
          let lastActiveTab={};
          if(lastActiveTabString != null)
            lastActiveTab= JSON.parse(lastActiveTabString);

          //
          if(lastActiveTab.hasOwnProperty("url") && lastActiveTab.hasOwnProperty("lastDateVal")){
            let lastUrl = lastActiveTab["url"];
            let currentDateVal = Date.now();
            let passedSeconds = (currentDateVal - lastActiveTab["lastDateVal"])*0.001

            if(tabTimeObject.hasOwnProperty("lastUrl")){
              let lastUrlObjectInfo = tabTimeObject["lastUrl"];
              if(lastUrlObjectInfo.hasOwnProperty("trackedSeconds")){
                lastUrlObjectInfo["trackedSeconds"] = lastUrlObjectInfo["trackedSeconds"] + passedSeconds;
              }else{
                  lastUrlObjectInfo["trackedSeconds"] = passedSeconds;
              } 
              lastUrlObjectInfo["lastDateVal"]=currentDateVal;

            } else{
                let newUrlInfo = {url:lasturl,trackedSeconds: passedSeconds, lastDateVal: currentDateVal}
                tabTimeObject[lastUrl] = newUrlInfo; 
            }

            
          }
          //
          let currentDateValue = Date.now();
          //
          let lastTabInfo = {"url": hostName, "lastDateVal": currentDateValue};
          if(!isWindowsActive){
            lastTabInfo={};
          }
          //
          let newLastTabObject={};
          newLastTabObject[lastActiveTabKey] = JSON.stringify(lastTabInfo); 

          chrome.storage.local.set(newLastTabObject,function(){
            console.log("lastActiveTab store: "+hostName);
            const tabTimeObjectString = JSON.stringify(tabTimeObject);
            let newTabTimeObject = {};
            newTabTimeObject[tabTimeObjectKey] = tabTimeObjectString;
            chrome.storage.local.set(newTabTimeObject,function(){

            });
          });
        });
      }
  });
}

function onTabTrack(activeInfo){
  let tabId = activeInfo.tabId;
  let windowId = activeInfo.windowId;

  //chrome.tabs.getSelected: deprecated, use tabs.query instead
  processTabChange(true);
}

chrome.tabs.onActivated.addListener(onTabTrack);
