const http = require("http");
const jsdom = require("jsdom");
const events = require("events");
const fs = require("fs");
const cliargs = require("minimist")
const singlelog = require("./process_log");
const dwn = require("./download");
const avparser = require("./avtb_parser");

//const { exit } = require("process");

const {JSDOM} = jsdom;
const HOST = "http://www.avtb2165.com";
var rateCtrl = new events.EventEmitter();
var emitCnt = 1;
var infolist = [];

const args = cliargs(process.argv.slice(2), opts={default: {downloadlimit:0, maxpages:10, update:false, path:"./"}})
//console.log(args);
//process.exit(0);


if (args["update"] === false && fs.existsSync("./info.list")) {
    fs.readFile("./info.list", (err, data)=>{
        infolist = JSON.parse(data);
        console.log("loaded local info.list, total "+infolist.length);
        rateCtrl.emit("finish");
    });
} else {
    var collector = new dwn.downloadCollector(args["maxpages"]);

    rateCtrl.on("crawl", id=>{
        let d = new dwn.Downloader(HOST + (id==1 ? "/#" : "/recent/"+id+"/"), id, parser=avparser.page_parser, onend=obj=>{
            if (obj.done > 0) {
                infolist = infolist.concat(obj.data_ref.data)
                console.log(`parse page ${obj.url} OK: ${obj.retcode} +${obj.data_ref.data.length}/${infolist.length}`)
                //console.log(`got obj dataref ${obj.data_ref.data.length}/${infolist.length}`)
            } else {
                console.log(`parse page ${obj.url} fail: ${obj.retcode} ${obj.process}`)
            }

            collector.emit(collector.data_signal, obj.id, obj.done>0?true:false, collector);
        });
        d.crawl()
    });

    collector.on(collector.end_signal, obj=>{
        console.log(`pages ${args["maxpages"]} done: ok ${obj.countOK}, fail ${obj.countFail}`);
        rateCtrl.emit("finish");
    })

    const intID = setInterval(() => {
        rateCtrl.emit("crawl", emitCnt++);
        if (emitCnt > args["maxpages"]) {
            clearInterval(intID);
        }
        //console.log("emit page "+(emitCnt-1));
    }, 1000);
}

rateCtrl.on("finish", ()=>{
    if (infolist.length < 1) {
        console.log("Fatal: no list got!");
        process.exit(-1);
    }

    if (args["update"] === true || ! fs.existsSync("./info.list")) {
        fs.writeFile("./info.list", JSON.stringify(infolist, null, 2), {flag: "w+"}, err=>{
            if (err) throw err;
            console.log("crawl done! total "+infolist.length);
        });
    }

    if (args["downloadlimit"] > 0) {
        rateCtrl.emit("download", infolist.slice(0,args["downloadlimit"]), args["path"]);
    }
});

rateCtrl.on("download", (inlst, path)=>{
    var id = 1;
    var proclist = [];
    var collector = new dwn.downloadCollector(args["downloadlimit"]);
    var endflag = false;

    singlelog.open();

    inlst.forEach(i => {
        let d = new dwn.Downloader(HOST+i.href, id++, parser=avparser.video_parser, onend=obj=>{
            if (obj.done <= 0) {
                console.log(`video ${obj.id}.${obj.filename} ${obj.done}: ${obj.process}`)
            }
            collector.emit(collector.data_signal, obj.id, obj.done>0?true:false, collector);
        }, path=path);
        d.crawl();
        proclist.push(d);
        console.log("crawling "+HOST+i.href+" ...");
    });

    collector.on(collector.end_signal, obj=>{
        endflag = true;
    })

    var shower = setInterval(() => {
        singlelog.append(`download collector: ${collector.countOK}/${collector.countFail}/${collector.counter}/${collector.limit}`);
        proclist.forEach(p =>{
            if (p.done >= 0) {
                singlelog.append(`${p.filename} ${p.process}`);
            }
        });
        
        if (singlelog.lines() > 0) {
            singlelog.show();
        }

        if (endflag === true) {
            clearInterval(shower);
            singlelog.close();
            console.log(`video download done: ${collector.counter}/${args["downloadlimit"]}, ok ${collector.countOK}, fail ${collector.countFail}, exit..`);
        }
    }, 5000);
});