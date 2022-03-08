const ex = require("express")
const app = ex()
const port = 8080

app.get("/", (req, res) => {
    res.send("<h1>Hello, express!</h1>");
})

app.listen(port, () => {
    console.log(`listen url: http://localhost:${port}`);
})