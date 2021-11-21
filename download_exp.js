
exports.ParseOK = class extends Error {
    constructor(msg) {
        super(msg);
        this.name = "ParseOK";
    }
}

exports.ParseOKandDownload = class extends exports.ParseOK {
    constructor(msg) {
        super(msg);
        this.name = "ParseOKandDownload"
    }
}

exports.ParseErr = class extends Error {
    constructor(msg) {
        super(msg);
        this.name = "ParseErr";
    }
}