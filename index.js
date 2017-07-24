const fs = require('fs');
var ini = require('ini');
var parse = require('node-sqlparser').parse;

var m_filename = Symbol('filename');
var m_data = Symbol('data');

class IniFile {
    constructor(filename) {
        var self = this;
        this[m_filename] = filename;
        this[m_data] = ini.parse(fs.readFileSync(this[m_filename], 'utf-8'));
    }

    doWhere(where, data) {
        if (where === null) return true;
        var self = this;

        function getVal(obj) {
            if (obj.type === "column_ref") return data[obj.column];
            if (obj.type === "binary_expr") return self.doWhere(obj, data);
            return obj.value;
        }

        switch (where.type) {
            case "binary_expr":
                switch(where.operator) {
                    case "=":
                        return getVal(where.left) == getVal(where.right);
                    case "!=":
                    case "<>":
                        return getVal(where.left) != getVal(where.right);
                    case "AND":
                        return getVal(where.left) && getVal(where.right);
                    case "OR":
                        return getVal(where.left) && getVal(where.right);
                    case "IS":
                        return getVal(where.left) === getVal(where.right)
                    default:
                        return false;
                }
                break;
            default:
                return false;
        }
    }

    chooseFields(sqlObj, data, row) {
        if (sqlObj.columns === "*") {
            let result = {};
            for (let key in row) {
                if (typeof row[key] !== 'object') {
                    result[key] = row[key];
                }
            }
            data.push(result);
            return;
        }

        let isAggregate = sqlObj.columns.some((col) => { return col.expr.type === 'aggr_func'; });

        if (isAggregate === true) {
            if (data.length === 0) {
                data.push({});
            }

            for (let col of sqlObj.columns) {
                let name, data_row;
                switch(col.expr.type) {
                    case 'column_ref':
                        name = col.as || col.expr.column;
                        data[0][name] = row[col.expr.column];
                        break;
                    case 'aggr_func': 
                        name = col.as || col.expr.name.toUpperCase() + "(" + col.expr.args.expr.column + ")";
                        
                        switch(col.expr.name.toUpperCase()) {
                            case 'SUM':
                                if (data[0][name] === undefined) {
                                    data[0][name] = 0;
                                }
                                data[0][name] += row[col.expr.args.expr.column];
                                break;
                            case 'COUNT':
                                if (data[0][name] === undefined) {
                                    data[0][name] = 0;
                                }
                                data[0][name]++;
                                break;
                        }
                        break;
                }
            }
        } else {
            let result = {};
            for (let col of sqlObj.columns) {
                let name = col.as || col.expr.column;
                result[name] = row[col.expr.column];
            }
            data.push(result);
        }
    }

    doSelect(resolve, reject, sqlObj) {
        let iniScope, rows = [];

        if (sqlObj.from.length !== 1) {
            return reject("Selects from more than one table are not supported");
        }
        
        if (sqlObj.groupby !== null) {
            console.warn("GROUP BY is unsupported");
        }

        if (sqlObj.orderby !== null) {
            console.warn("ORDER BY is unsupported");
        }

        if (sqlObj.limit !== null) {
            console.warn("LIMIT is unsupported");
        }

        if (sqlObj.from[0].table === "ROOT") {
            iniScope = this[m_data];
        } else {
            iniScope = this[m_data][sqlObj.from[0].table];
        }

        if (this.doWhere(sqlObj.where, iniScope) === true) {
            this.chooseFields(sqlObj, rows, iniScope);
        }
        resolve(rows);
    }

    doUpdate(resolve, reject, sqlObj) {
        let iniScope;
        if (sqlObj.table === "ROOT") {
            iniScope = this[m_data];
        } else {
            iniScope = this[m_data][sqlObj.table];
        }

        for (let field of sqlObj.set) {
            iniScope[field.column] = ini.safe(field.value.value);
        }

        fs.writeFile(this[m_filename], ini.encode(this[m_data]), (err) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(true);
        });
    }

    runSQL(sql) {
        var self = this;
        return new Promise((resolve, reject) => {
            let sqlObj;
            try {
                sqlObj = parse(sql);
            } catch (err) {
                if (/^UPDATE/i.test(sql) && !(/WHERE/i.test(sql))) {
                    sqlObj = parse(sql + ' WHERE true = true');
                } else {
                    reject(err);
                    return;
                }
            }

            switch(sqlObj.type) {
                case 'select':
                    this.doSelect(resolve, reject, sqlObj);
                    break;
                case 'update':
                    this.doUpdate(resolve, reject, sqlObj);
                    break;
                default:
                    reject("Unsupported SQL");
                    break;
            }
        });
    }

    execute(sql) {
        return this.runSQL(sql);
    }

    query(sql) {
        return this.runSQL(sql);
    }

    close() {
        
        return Promise.resolve(true);
    }
}

module.exports = {
    open: function(connection) {
        let filename = connection.Database;

        return new IniFile(filename);
    }
};