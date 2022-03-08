const fs = require("fs");
const cliargs = require("minimist")

const args = cliargs(process.argv.slice(2), opts={default: {downloadlimit:0, maxpages:10, update:false, path:"./", clean:false}})

if (args["clean"]) {
    let asyncReaddir = () => {
        let f = new Promise((resolve, reject) => {
            fs.readdir("/Users/ning", (err, files) => {
                if (err) {
                    reject(err)
                    return
                }
                console.log("raddir done");
                return resolve(files)
            });
        })
    
        f.then(files=>{
            files.forEach(ff => {
                if (ff.includes(".st")) {
                    let name = ff.split(".")[-1];
                    console.log(`clean ${ff}, ${name}`);
                } else {
                    console.log(`normal file ${ff}`);
                }
            })
            console.log(`total files: ${files.length}`)
        })
        .catch(err => console.log(`Err: clean path ${args['path']} fail, ${err}`))
        .finally(()=>{
            console.log("all done");
            process.exit(0);
        })
    
        return f;
    }
    
    let doRead = async () => {
        console.log("await begin");
        await asyncReaddir();
        console.log("await done");
    }
    
    doRead();
    //return;
}

console.log("!!!donedone!!!")