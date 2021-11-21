const readline = require("readline")

var counter = 0;
var buf = [];

var rl = null;
var prompt_len = 0;

exports.open = () => {
    rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: true,
        prompt: ">> "
    });

    prompt_len = rl.getPrompt().length
}

exports.show = ()=>{
    readline.moveCursor(process.stdout, -prompt_len, counter>0?-buf.length:0);
    buf.forEach(l=>{
        readline.clearLine(process.stdout, 0);
        console.log(l);
    })
    rl.prompt()
    counter++;
    buf = [];
}

exports.append = msg=>{
    buf.push(msg);
}

exports.close = ()=>{
    rl.close()
}

exports.lines = ()=>{
    return buf.length;
}

function test() {
    exports.open();
    var cnt = 10;
    setInterval(()=>{
        exports.append(`aaa ... ${cnt}`);
        exports.append(`bbb ... ${cnt}`);
        exports.append(`ccc ... ${counter}`);
        exports.show();
        cnt--;
    }, 1000)
}

//test()