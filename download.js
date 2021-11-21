'use strict';

const {spawn, exec, execFile} = require("child_process");
const http = require("http");
const {JSDOM} = require("jsdom");
const { exit } = require("process");
const events = require("events");
const { link } = require("fs");
const downexp = require("./download_exp");
const { info } = require("console");

exports.Downloader = class {
    #url = '';
    #mp4link = '';
    #id = 0;
    #path = '';
    #child = null;
    #buf = '';
    #dom = null;
    #stderr = '';
    #stdout = '';
    #process = '';
    #retcode = -1000;
    #es = new events.EventEmitter();
    #filename = '';
    #done = 0;
    #parser_func = null;
    #data_ref = {id:0, link:"", filename:"", data:null};
    #on_end = null

    constructor(url, id, parser, onend=null, path="./") {
        this.#url = url;
        this.#id = id;
        this.#path = path;
        this.#parser_func = parser;
        this.#on_end = onend;
        this.#data_ref.id = this.#id

        this.#es.on("parsed", ondownload);
        this.#es.on("fail", onclean);
        this.#es.on("downloaded", onclean);
    }

    crawl() {
        this.#buf = '';

        http.get(this.#url, res=>{
            res.on('data', data=>{
                this.#buf += data;
            });
            res.on('end', ()=>{
                this.#retcode = res.statusCode;
                let ret = this.#parse();
                if (ret[0] && ret[1]) {
                    this.#es.emit("parsed", this);
                } else if (ret[0]) {
                    this.#done = 2;
                    this.#es.emit("downloaded", this);
                } else {
                    this.#done = -1;
                    this.#process = "download "+this.#url+" failed: "+this.#retcode.toString()+` ${ret[2]}`;
                    this.#es.emit("fail", this);
                }
            })
        });
    }

    clean() {
        if (this.#on_end && this.#on_end != null) {
            //console.log(`downloader ${this.#id} ok, dataref ${this.#data_ref.data.length}`);
            this.#on_end(this);
        }
    }

    get url() {
        return this.#url;
    }

    get id() {
        return this.#id;
    }

    get filename() {
        return this.#filename;
    }

    get path() {
        return this.#path
    }

    get done() {
        return this.#done
    }

    get retcode() {
        return this.#retcode
    }

    get buf() {
        return this.#buf
    }

    get process() {
        return this.#process
    }

    get data_ref() {
        return this.#data_ref
    }

    download() {
        this.#child = spawn("/usr/local/bin/axel", ["--no-clobber", "--output="+this.#path+"/"+this.#filename, this.#mp4link, ]);
        this.#child.stdout.on('data', data=>{
            this.#stdout += data;
            let arr = this.#stdout.split(/[\r\n]/);
            if (arr.length > 1) {
                this.#process = arr.slice(-2, -1)[0];
            }
        });
        this.#child.stderr.on('data', data=>{ this.#stderr += data; });
        this.#child.on('close', code=>{
            this.#retcode = code;
            if (code == 0) {
                this.#process = "download "+this.#id.toString()+"."+this.#path+"/"+this.#filename+" finished, ret "+code+" done";
                this.#done = 1;
            } else {
                this.#process = `download fail, ret ${code}`; // + this.#stderr.length>0?this.#stderr:this.#stdout;
                this.#done = -1;
            }
            this.#es.emit("downloaded", this);
        })

        console.log("ready to download "+this.#mp4link+" ...");
    }

    #parse() {
        var ret = false, need_download = false, msg = '';
        this.#dom = new JSDOM(this.#buf);
        this.#mp4link = '';
        this.#filename = '';
        
        try {
             this.#parser_func(this.#dom, this.#data_ref)
        } catch(e) {
            if ( e instanceof downexp.ParseOK ) {
                this.#mp4link = this.#data_ref.link;
                this.#filename = this.#data_ref.filename;
                ret = true
                if (e instanceof downexp.ParseOKandDownload) {
                    need_download = true;
                }
                //console.log(`parse ok: ${e}, download ${need_download}`);
            } else {
                msg = `${e}`;
            }
        }

        return [ret, need_download, msg];
    }
}

function onclean(obj) {
    obj.clean();
}

function ondownload(obj) {
    obj.download();
}

exports.downloadCollector = class extends events.EventEmitter {
    /**
     * collector.on("data", (id, done)=>{})
     * collector.on("end", (okcnt, failcnt)=>{})
     */
    #countOK = 0;
    #countFail = 0;
    #counter = 0;
    #limit = 0;
    #data_signal = "data";
    #end_signal = "end";

    constructor(limit) {
        super();
        this.#limit = limit;
        this.on(this.#data_signal, (id, done, obj)=>{
            if (done) {
                obj.countOK++;
            } else {
                obj.countFail++;
            }
            obj.counter++;

            if (obj.counter >= obj.limit) {
                //console.log(`collector: ${obj.countOK}/${obj.countFail}/${obj.counter}/${obj.limit}`)
                obj.emit(obj.end_signal, obj);
            }
        });
    }

    get counter() { return this.#counter; }
    set counter(val) { this.#counter = val; }
    get countOK() { return this.#countOK; }
    set countOK(val) { this.#countOK = val; }
    get countFail() { return this.#countFail; }
    set countFail(val) { this.#countFail = val; }
    get limit() { return this.#limit; }
    get data_signal() { return this.#data_signal; }
    get end_signal() { return this.#end_signal; }
}