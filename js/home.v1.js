function checkEmail(email) {
    var emailRegex = /[\w-]+(\.[\w-]+)*@[\w-]+(\.[\w-]+)+/g;
    var isEmail = email.match(emailRegex);
    isEmail = isEmail && isEmail.length > 0;
    if (!isEmail) {
        bootbox.dialog({
            title: 'Invalid Email',
            message: "Please provide a valid email address",
        });
        return isEmail;
    }
    return isEmail;
}

function checkWallet(wallet) {
    var walletRegex = /(0x)?[\w]{48}/g;
    var isWallet = wallet.match(walletRegex);
    isWallet = isWallet && isWallet.length > 0;
    if (!isWallet) {
        bootbox.dialog({
            title: 'Invalid Wallet Address',
            message: "[0x] + hex string(40 letters) + checksum(8 letters)",
        });
        return isWallet;
    }
    return isWallet;
}

function getQueryVariable(variable)
{
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
            var pair = vars[i].split("=");
            if(pair[0] == variable){return pair[1];}
    }
    return null;
}

function getValueDecimal(value,maxDecimal=6) {
    var decimal=0;
    if(typeof(value)==="string")
        value = parseFloat(value);
    var fixedValue = value.toFixed(maxDecimal);
    var decimalValue = fixedValue-parseInt(fixedValue);
    if(decimalValue===0)
        return 0;
    for(var rate=1;decimal<maxDecimal;++decimal,rate*=10) {
        var temp = parseInt(decimalValue * rate);
        if(temp/rate == decimalValue)
            break;
    }
    return decimal;
}

function getWindowSize(){
	var w = window.innerWidth ||
		document.documentElement.clientWidth ||
		document.body.clientWidth;

	var h = window.innerHeight ||
		document.documentElement.clientHeight ||
		document.body.clientHeight;

	return {
		width: w,
		height: h
	};
}

//if(os.isAndroid || os.isPhone)
var os = function() {  
    var ua = navigator.userAgent,  
    isWindowsPhone = /(?:Windows Phone)/.test(ua),  
    isSymbian = /(?:SymbianOS)/.test(ua) || isWindowsPhone,   
    isAndroid = /(?:Android)/.test(ua),   
    isFireFox = /(?:Firefox)/.test(ua),   
    isChrome = /(?:Chrome|CriOS)/.test(ua),  
    isTablet = /(?:iPad|PlayBook)/.test(ua) || (isAndroid && !/(?:Mobile)/.test(ua)) || (isFireFox && /(?:Tablet)/.test(ua)),  
    isPhone = /(?:iPhone)/.test(ua) && !isTablet,  
    isPc = !isPhone && !isAndroid && !isSymbian;  
    return {  
         isTablet: isTablet,  
         isPhone: isPhone,  
         isAndroid : isAndroid,  
         isPc : isPc  
    };  
}(); 

function isWeixin() { //判断是否是微信
    var ua = navigator.userAgent.toLowerCase();
    return ua.match(/MicroMessenger/i) == "micromessenger";
};

// 对Date的扩展，将 Date 转化为指定格式的String     
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，     
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)     
// 例子：     
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423     
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18     
Date.prototype.Format = function(fmt)     
{      
  var o = {     
    "M+" : this.getMonth()+1,                 //月份     
    "d+" : this.getDate(),                    //日     
    "h+" : this.getHours(),                   //小时     
    "m+" : this.getMinutes(),                 //分     
    "s+" : this.getSeconds(),                 //秒     
    "q+" : Math.floor((this.getMonth()+3)/3), //季度     
    "S"  : this.getMilliseconds()             //毫秒     
  };     
  if(/(y+)/.test(fmt))     
    fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));     
  for(var k in o)     
    if(new RegExp("("+ k +")").test(fmt))     
  fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));     
  return fmt;     
}  

function formatTime(timestamp) {
    var time = new Date(timestamp).Format("yyyy-MM-dd hh:mm:ss");
    return time;
}