var db = require('.');

var connection = db.open({
    Database: 'test.ini'
});

function handleError(error) {
    console.log("ERROR:", error);
    process.exit(1);
}

connection.query("SELECT * FROM test1 WHERE key = 'name'").then((data) => {
    if (data.length != 1) {
        handleError(new Error("Invalid data returned"));
    }
    connection.close().then(() => {
        process.exit(0);
    }).catch(handleError);
}).catch(handleError);