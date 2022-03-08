const YAML = require('yaml');
const fsp = require('fs/promises');
const cliargs = require('minimist');
const os = require('os');

const args = cliargs(process.argv.slice(2), {default: {rule:'', show:false}});

// stat: {Stat: HTTP, Payload: p, Result: bool, Response: Object};
var Task_Table = {
    HTTP: null,
    SHELL: null,
    SCAN: null,
    PROC: stat => {
        let func = Task_Table[stat.Stat];
        if (func) {
            stat = func(stat);
        } else {
            //stat.Payload.result['on_fail'] = 'fail';
            console.log(`stat ${stat.Stat} not registered`);
        }
        return stat;
    },
    TYPE: 'worker', // or 'target'
    LOCALIP: '',
};

function update_ip() {
    var intf = os.networkInterfaces();
    for (let devname in intf) {
        let iff = intf[devname];
        for (let info of iff) {
            if (info.family === 'IPv4' && info.address !== '127.0.0.1') {
                return info.address;
            }
            //console.log(`${JSON.stringify(info)}`);
        }
    }

    return '0.0.0.0';
}

function register_shell(conf) {
    Task_Table.SHELL = stat => {
        return stat;
    };
    Task_Table.HTTP = stat => {
        return stat;
    };
    Task_Table.SCAN = stat => {
        return stat;
    };

    for(let k of Object.keys(conf.rule_info.workergroup)) {
        if (k === Task_Table.LOCALIP) {
            Task_Table.TYPE = 'worker';
            return 'worker';
        }
        for (let ip of conf.rule_info.workergroup[k]) {
            if (ip === Task_Table.LOCALIP) {
                Task_Table.TYPE = 'target';
                return 'target';
            }
        }
    }
    Task_Table.TYPE = '';
    return '';
}

async function _loadYaml(path) {
    let buf = null, rst = null;

    try {
        buf = await fsp.readFile(path, {flag: 'r'});
        rst = YAML.parse(buf.toString(), {prettyErrors: true});
    } catch (e) {
        console.log(`parsing fail: ${buf?.toString()}`);
        console.log(`EXCEPT: ${e}`);
        buf = null;
        rst = null;
    } finally {
        return rst;
    }
}

async function task() {
    if (args.rule.length <= 0) {
        throw "no rule file";
    }

    let rst = await _loadYaml(args.rule);
    if (rst) {
        if (args.show) {
            console.log(`rst: ${JSON.stringify(rst, null, '  ')}`);
            return;
        }
    } else {
        throw Error("parse yaml fail");
    }

    register_shell(rst);
    console.log(`get agent type: ${Task_Table.TYPE} on ${Task_Table.LOCALIP}`);

    for (let id = 0; id < rst.payload.length; ) {
        let key = Object.keys(rst.payload[id])[0];
        let pstat = {
            Stat: key,
            Result: false,
            Response: null,
            Payload: rst.payload[id][key],
        };

        if (Task_Table.hasOwnProperty(pstat.Stat)) {
            let newstat = Task_Table.PROC(pstat);
            console.log(`running payload ${newstat.Stat}, rst ${newstat.Result}, resp ${newstat.Response}, jumpto ${newstat.Payload.result.on_fail}`);

            if (newstat.Result === false) {
                let jumpto = parseInt(newstat.Payload.result.on_fail);
                if (jumpto >= 0 && jumpto < rst.payload.length) {
                    id = jumpto;
                } else {
                    break;
                }
            } else {
                id++;
            }

            console.log(`jump to stat ${id}`);
        } else {
            throw `stat ${pstat.Stat} not reg`;
        }
    }
}

function main() {
    task().catch(e => {
        console.log(`run fail: ${e}`);
    })
    .finally(() => {
        console.log("everything done1");
    });

    task().catch(e => {
        console.log(`run fail: ${e}`);
    })
    .finally(() => {
        console.log("everything done2");
    });

    console.log("continue ...");
}

Task_Table.LOCALIP = update_ip();
main();