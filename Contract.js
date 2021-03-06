'use strict';

const version="1.0.2";
const unit_nas=new BigNumber(1000000000000000000);


var Issuer = function (obj) {
    if (typeof obj === "string") {
        obj = JSON.parse(obj);
    }
    if (typeof obj === "object") {
        this.name = obj.name;
    }
    else {
        this.name = "";
    }
}

Issuer.prototype = {
    toString: function () {
        return JSON.stringify(this);
    }
}

var DinnerList = function(obj) {
    if (typeof obj === "string") {
        this.ids = JSON.parse(obj);
    }
    else if(Object.prototype.toString.call(obj)=='[object Array]') {
        this.ids=obj;
    }
    else
        this.ids=[];
}

DinnerList.prototype = {
    toString: function () {
        return JSON.stringify(this.ids);
    },
    addDinner:function(id){
        for(var i=0;i<this.ids.length;++i)
            if(id == this.ids[i])
                return;
        this.ids.push(id);
    },
    removeDinner:function(id){
        for(var i=0;i<this.ids.length;++i) {
            if(id == this.ids[i]) {
                this.ids.splice(i,1);
                return;
            }
        }
    }
}

var Dinner = function(obj) {
    if (typeof obj === "string") {
        obj = JSON.parse(obj);
        for(var i=0;i<obj.bidders.length;++i)
            obj.bidders[i].nasInWei = new BigNumber(obj.bidders[i].nasInWei);
    }
    if (typeof obj === "object") {
        this.ownerAddr = obj.ownerAddr;     //发起人钱包地址
        this.hash = obj.hash;               //发起交易的hash
        this.title = obj.title;             //主题
        this.text = obj.text;               //活动介绍(html格式)
        this.beginBlock = obj.beginBlock;   //开始报名区块号
        this.endBlock = obj.endBlock;       //结束报名区块号
        this.nasTook = obj.nasTook;                 //nas是否已经领取
        this.locked = obj.locked;                   //是否锁定，锁定后不能竞价，不能领取奖励
        this.contactInfo = obj.contactInfo;         //竞家联系方式
        this.bidders = obj.bidders||[];             //竞投的历史记录
        this.minBidStep = obj.minBidStep||"0.1";    //竞价起跳最多NAS数
        this.maxBidStep = obj.maxBidStep||"5";      //竞价起跳最多NAS数
        this.sharePercent = obj.sharePercent||"0";  //投标人分享投标比例（百分比）
    }
};

Dinner.prototype = {
    toString: function () {
        return JSON.stringify(this);
    },
    bid:function(hash,addr,user,nasInWei,time){
        if(!this.isActive()) {
            throw new Error("not active");
        }
        var maxLimit = unit_nas.times(this.maxBidStep);
        var minLimit = unit_nas.times(this.minBidStep);
        var topBidder = this.getTopBidder();        
        if(!!topBidder) {
            if(nasInWei.lt(topBidder.nasInWei.plus(minLimit))) {
                throw new Error("nas is too less");
            }
            if(nasInWei.eq(topBidder.nasInWei)) {
                if(time >= topBidder.time)
                throw new Error("time is too late");
            }
            maxLimit=topBidder.nasInWei.plus(maxLimit);
        }
        if(nasInWei.gt(maxLimit)) {
            throw new Error("nas is too more");
        }

        if(!!topBidder)
            this.sendNasBack(topBidder);
        
        this.bidders.push({
            hash:hash,
            addr:addr,
            user:user,
            nasInWei:nasInWei.toString(10),
            time:time
        });
        return "ok";
    },
    getTopBidder:function() {
        if(this.bidders.length>0)
            return this.bidders[this.bidders.length-1]
        return null;
    },
    sendNasBack:function(bidder) {
        if(!!bidder&&bidder.nasInWei.gt(0)) {
            var result = Blockchain.transfer(bidder.addr, bidder.nasInWei);
            console.log("transfer result:", result);
            if(result) {
                Event.Trigger("transfer", {
                    Transfer: {
                        from: Blockchain.transaction.to,
                        to: bidder.addr,
                        value: bidder.nasInWei
                    }
                });
            }
            else {
                throw new Error("return nas fails, transfer result:" + Json.stringify(result));            
            }
        }
    },
    isActive:function(){
        var block = Blockchain.block.height;
        return block>=this.beginBlock&&block<this.endBlock;
    }
}


var DinnerContract = function () {
    LocalContractStorage.defineProperties(this, {
        _name: null,
        _creator: null
    });

    LocalContractStorage.defineMapProperties(this, {
        "dinners": {
            parse: function (value) {
                return new Dinner(value);
            },
            stringify: function (o) {
                return o.toString();
            }
        },
        "issuers": {
            parse: function (value) {
                return new Issuer(value);
            },
            stringify: function (o) {
                return o.toString();;
            }
        },
        "issuerDinnerList": {
            parse: function (str) {
                return new DinnerList(str);
            },
            stringify: function (o) {
                return o.toString();
            }
        }
    });
};

DinnerContract.prototype = {
    //智能合约初始化函数，只会在部署的时候执行一次
    init: function () {
        this._name = "17Fan8";
        this._creator = Blockchain.transaction.from;
    },

    name: function () {
        return this._name;
    },

    version:function() {
        return version;
    },

    //添加颁布地址，只有这些地址才能颁布奖状
    addIssuerAddr:function (addr,name) {
        var from = Blockchain.transaction.from;
        if(from != this._creator) {
            throw new Error("You are not the manager!");
        }

        this.issuers.set(addr,new Issuer({name:name}));
    },

    //删除颁布地址
    removeIssuerAddr:function (addr) {
        var from = Blockchain.transaction.from;
        if(from != this._creator) {
            throw new Error("You are not the manager!");
        }

        this.issuers.del(addr);
    },

    //添加活动
    addDinner:function (ownerAddr, title, text, beginBlock, endBlock, minBidStep, maxBidStep, sharePercent) {
        if(Blockchain.verifyAddress(ownerAddr)!==87) {
            throw new Error("ownerAddr is not a user address!");
        }

        var from = Blockchain.transaction.from;
        var issuer = this.issuers.get(from);
        if(issuer == null) {
            throw new Error("You are not a issuer!");
        }

        var hash = Blockchain.transaction.hash;
        this.dinners.set(hash,new Dinner({
            ownerAddr:ownerAddr,
            hash:hash,
            title:title,
            text:text,
            beginBlock:parseInt(beginBlock),
            endBlock:parseInt(endBlock),
            minBidStep:minBidStep,
            maxBidStep:maxBidStep,
            sharePercent:sharePercent
        }));

        var list = this.issuerDinnerList.get(from)||new DinnerList();
        list.addDinner(hash);
        this.issuerDinnerList.set(from,list);
    },

    //删除活动
    removeDinner:function (hash) {
        var from = Blockchain.transaction.from;
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("Can't find dinner!");
        }
        
        if(from != dinner.ownerAddr && this._creator != from) {
            throw new Error("You have not permission!");
        }

        this.dinners.del(hash);

        var list = this.issuerDinnerList.get(from);
        if(list) {
            list.removeDinner(hash);
            this.issuerDinnerList.set(from,list);
        }
    },

    // 查询所有活动
    listByIssuer: function (issuer) {
        return this.issuerDinnerList.get(issuer);
    },

    info:function(hash) {
        return this.dinners.get(hash);
    },

    uploadDinner:function(str){
        var from = Blockchain.transaction.from;
        if(from !== this._creator) {
            throw new Error("not creator address!");
        }
        var dinner = new Dinner(str);
        if(!dinner.hash||dinner.hash==""){
            throw new Error("hash is empty!")
        }
        if(!dinner.ownerAddr||dinner.ownerAddr==""){
            throw new Error("ownerAddr is empty!")
        }

        var issuer = this.issuers.get(dinner.ownerAddr);
        if(issuer == null) {
            throw new Error("ownerAddr is not a issuer!");
        }

        this.dinners.set(dinner.hash,dinner);

        var list = this.issuerDinnerList.get(dinner.ownerAddr)||new DinnerList();
        list.addDinner(dinner.hash);
        this.issuerDinnerList.set(dinner.ownerAddr,list);
    },

    //如果是单条数据，则添加到最后，如果是一个队列，则替换原有竞投数据
    uploadBidder:function(hash,str){
        var from = Blockchain.transaction.from;
        if(from !== this._creator) {
            throw new Error("not creator address!")
        }
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var bidder = JSON.parse(str);
        if(Object.prototype.toString.call(bidder)=='[object Array]') {
            dinner.bidders=bidder;
        }
        else {
            dinner.bidders.push(bidder);
        }

        this.dinners.set(hash,dinner);
    },

    //竞标
    bid: function(hash,user) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        if(dinner.locked) {
            throw new Error("is locked!");
        }

        dinner.bid(Blockchain.transaction.hash,
            Blockchain.transaction.from,
            user,
            Blockchain.transaction.value,
            Blockchain.transaction.timestamp);
        this.dinners.set(hash,dinner);
        return "ok";
    },

    //设置活动内容
    setText:function(hash, newText) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!")
        }
        dinner.text = newText;
        this.dinners.set(hash,dinner);
    },

    //设置活动主题
    setTitle:function(hash, newTitle) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!")
        }
        dinner.title = newTitle;
        this.dinners.set(hash,dinner);
    },

    //设置领取比例
    setSharePercent:function(hash, newPercent) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!")
        }
        dinner.sharePercent = newPercent;
        this.dinners.set(hash,dinner);
    },

    //设置开始区块
    setBeginBlock:function(hash, beginBlock) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!");
        }
        dinner.beginBlock = beginBlock;
        this.dinners.set(hash,dinner);
    },

    //设置结束区块
    setEndBlock:function(hash, endBlock) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!");
        }
        dinner.endBlock = endBlock;
        this.dinners.set(hash,dinner);
    },
    setMinBidStep:function(hash, minBidStep) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!");
        }
        dinner.minBidStep = minBidStep;
        this.dinners.set(hash,dinner);
    },

    setMaxBidStep:function(hash, maxBidStep) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!");
        }
        dinner.maxBidStep = maxBidStep;
        this.dinners.set(hash,dinner);
    },

    //冻结活动
    lock:function(hash,locked) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator) {
            throw new Error("not owner address!");
        }
        dinner.locked = locked;
        this.dinners.set(hash,dinner);
    },
    
    setContactInfo:function(hash,contactInfo) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }
        var topBidder = dinner.getTopBidder();
        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from && from !== this._creator && from !== topBidder.addr) {
            throw new Error("not owner address!");
        }
        dinner.contactInfo = contactInfo;
        this.dinners.set(hash,dinner);
    },

    //领取Nas
    takeNasByOwner:function(hash) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }

        if(dinner.isActive()) {
            throw new Error("bid has not stopped!");
        }

        if(dinner.nasTook) {
            throw new Error("the nas has be took.");
        }

        var from = Blockchain.transaction.from;
        if(dinner.ownerAddr !== from) {
            throw new Error("not owner address!");
        }

        dinner.nasTook=true;
        this.dinners.set(hash,dinner);

        var result = false;
        var topBidder = dinner.getTopBidder();
        if(!!topBidder) {
            var ownerNas = new BigNumber(topBidder.nasInWei);
            var bnPercent = new BigNumber(dinner.sharePercent);
            if(bnPercent.gt(0) && bnPercent.lte(100)) {
                var sharedNas = ownerNas.times(bnPercent).div(100);
                ownerNas = ownerNas.minus(sharedNas).dividedToIntegerBy(1);
            }

            if(ownerNas.gt(0)) {
                result = Blockchain.transfer(from, ownerNas);
                console.log("takeNas transfer result:", result);
                if(result) {
                    Event.Trigger("transfer", {
                        Transfer: {
                            from: Blockchain.transaction.to,
                            to: from,
                            value: ownerNas
                        }
                    });
                }
                else {
                    throw new Error("transfer result:" + Json.stringify(result));            
                }
            }
        }
        return "ok";
    },

    //领取Nas
    takeNasByBidder:function(hash) {
        var dinner = this.dinners.get(hash);
        if(!dinner) {
            throw new Error("no dinner matched!");
        }

        if(dinner.isActive()) {
            throw new Error("bid has not stopped!");
        }

        if(dinner.locked) {
            throw new Error("is locked!");
        }

        var bnPercent = new BigNumber(dinner.sharePercent);
        if(bnPercent.lte(0)){
            throw new Error("no shared!");
        }

        var result = false;
        var topBidder = dinner.getTopBidder();
        if(!!topBidder) {
            var ownerNas = new BigNumber(topBidder.nasInWei);
            var sharedNas = new BigNumber(0);
            var from = Blockchain.transaction.from;
            if(bnPercent.gt(0) && bnPercent.lte(100)) {
                var sharedUnit = ownerNas.times(bnPercent).div(100*dinner.bidders.length).dividedToIntegerBy(1);
                var bidders = dinner.bidders;
                for(var i = 0; i<bidders.length; ++i) {
                    var bidder = bidders[i];
                    if(!bidder.nasTook && bidder.addr == from) {
                        sharedNas = sharedNas.plus(sharedUnit);
                        bidder.nasTook = true;
                    }
                }
            }

            if(sharedNas.gt(0)) {
                result = Blockchain.transfer(from, sharedNas);
                console.log("takeNasByBidder transfer result:", result);
                if(result) {
                    this.dinners.set(hash,dinner);
                    Event.Trigger("transfer", {
                        Transfer: {
                            from: Blockchain.transaction.to,
                            to: from,
                            value: sharedNas
                        }
                    });
                }
                else {
                    throw new Error("transfer result:" + Json.stringify(result));            
                }
            }
        }

        return "ok";
    },

    accept:function(){
        Event.Trigger("transfer", {
            Transfer: {
                from: Blockchain.transaction.from,
                to: Blockchain.transaction.to,
                value: Blockchain.transaction.value,
            }
        });
    },

    //管理者领取Nas, 误充Nas可以用该接口提现
    takeNasByCreator:function(value) {
        var from = Blockchain.transaction.from;
        if(this._creator !== from) {
            throw new Error("not creator address!");
        }

        var value = new BigNumber(value);
        var result = Blockchain.transfer(from, value);
        console.log("takeNasByCreator transfer result:", result);
        if(result) {
            Event.Trigger("transfer", {
                Transfer: {
                    from: Blockchain.transaction.to,
                    to: from,
                    value: value
                }
            });
        }
        else {
            throw new Error("transfer result:" + Json.stringify(result));            
        }
        return "ok";
    }
};

module.exports = DinnerContract;