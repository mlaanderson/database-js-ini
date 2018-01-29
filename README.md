# database-js-ini
# database-js-firebase
[![Build Status](https://travis-ci.org/mlaanderson/database-js-ini.svg?branch=master)](https://travis-ci.org/mlaanderson/database-js-ini)

Database-js Wrapper for INI files
## About
Database-js-mysql is a wrapper around the [mysql](https://github.com/mysqljs/mysql) package by Doug Wilson. It is intended to be used with the [database-js](https://github.com/mlaanderson/database-js) package. However it can also be used in stand alone mode. The only reason to do that would be to use [Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise).
## Usage
~~~~
var Database = require('database-js2').Connection;

(async () => {
    let connection, statement, rows;
    connection = new Database('database-js-ini:///test.ini');
    
    try {
        statement = await connection.prepareStatement("SELECT * FROM ROOT");
        rows = await statement.query();
        console.log(rows);
    } catch (error) {
        console.log(error);
    } finally {
        await connection.close();
    }
})();
~~~~