const downexp = require("./download_exp");

exports.video_parser = function(dom, rst) {
    const el = dom.window.document.querySelectorAll("source");
    let srccnt = 0;
    el.forEach(es => {
        srccnt++;
        if (es.getAttribute("label") === "360p") {
            rst.link = es.src;
            rst.filename = es.src.split(/[/?]/).slice(-2, -1)[0];
            throw new downexp.ParseOKandDownload(`got mp4: ${es.src}`);
        }
    });

    throw new downexp.ParseErr(`no source tag found: ${srccnt}`);
}

exports.page_parser = function(dom, rst) {
    const el = dom.window.document.querySelectorAll("div.video");
    rst.data = []

    el.forEach(ee=>{
        var info = {id: rst.id};
        ee.childNodes.forEach(e=>{
            if (e.nodeName === "A") {
                info.href = e.href;
                //console.log("node: "+e.href);
                e.childNodes.forEach(i=>{
                    //console.log("\t"+i.nodeName+", "+i.className)
                    if (i.nodeName === "DIV" && i.className === "video-thumb") {
                        try {
                            i.childNodes.forEach(img=>{
                                if (img.nodeName === "IMG") {
                                    info.img = img.src;
                                    throw new Error("found img");
                                }
                            });
                        } catch(e) {

                        }
                    }
                    if (i.nodeName === "SPAN" && i.className === "video-rating text-success") {
                        info.rating = i.textContent;
                    }
                    if (i.nodeName === "SPAN" && i.className === "video-title") {
                        info.title = i.textContent;
                    }
                });
            }
        });

        rst.data.push(info);
    });

    if (rst.data.length > 0) {
        throw new downexp.ParseOK(`parse page ${rst.id} ok, ${rst.data.length}`);
    } else {
        throw new downexp.ParseErr("parse page fail");
    }
}