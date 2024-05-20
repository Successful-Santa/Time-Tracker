function convertToHours(a){
    let h,m,s;
    h=Math.floor(a/3600);
    m=Math.floor((a%3600)/60);
    s=a%60;
    h=h.toString();
    m=m.toString();
    s=s.toString();
    let b=h+' : '+m+' : '+s;
    return b;
}


chrome.storage.local.get("tabTimeObject",function(dataCont){
    console.log(dataCont);
    let dataString = dataCont["tabTimesObject"];
    
    let totaltime=0;
    let studytime=0;
    let enttime=0;
    let othertime=0;
    let studyhosts=["w3schools.com","leetcode.com","neetcode.io","github.com","stackoverflow.com"];
    let enthosts=["netflix.com","youtube.com","X.com","instagram.com","reddit.com"];

    if(dataString == null){
        return;
    }

    try{
        let data = JSON.parse(dataString);
        for (let key in data) {
            if (data[key] && typeof data[key]["trackedSeconds"] === 'number') {
                if (studyhosts.includes(key)) {
                    studytime += data[key]["trackedSeconds"];
                } else if (enthosts.includes(key)) {
                    enttime += data[key]["trackedSeconds"];
                }
                totaltime += data[key]["trackedSeconds"];
            }
        }
        othertime = totaltime - (enttime + studytime);
    } catch(err){
        console.log("loading the tabTimesObject went wrong");
    }
    let totaltimes = convertToHours(totaltime);
    let enttimes = convertToHours(enttime);
    let studytimes = convertToHours(studytime);
    let othertimes = convertToHours(othertime);
    console.log(totaltime);
    document.getElementById("totalTime").innerHTML = totaltimes;
    document.getElementById("study").innerHTML = studytimes;
    document.getElementById("entertainment").innerHTML = enttimes;
    document.getElementById("others").innerHTML = othertimes;

})