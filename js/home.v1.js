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