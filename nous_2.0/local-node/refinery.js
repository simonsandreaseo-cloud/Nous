const fs = require('fs');
const { parse } = require('papaparse'); // We can use the same lib in node

async function run() {
    const inputArg = process.argv[process.argv.length - 1];
    let input = {};
    try {
        input = JSON.parse(inputArg);
    } catch (e) {
        process.exit(1);
    }

    const { filePath } = input;

    if (!filePath || !fs.existsSync(filePath)) {
        console.log(JSON.stringify({ error: "File not found: " + filePath }));
        process.exit(1);
    }

    const fileStream = fs.createReadStream(filePath);
    let rowCount = 0;
    const results = [];

    // Parse with streams for large files
    parse(fileStream, {
        header: true,
        skipEmptyLines: true,
        step: function (row) {
            rowCount++;
            // We only take first 500 for preview to avoid overloading bridge
            if (rowCount <= 500) {
                results.push(row.data);
            }
        },
        complete: function () {
            console.log(JSON.stringify({
                success: true,
                totalRows: rowCount,
                preview: results,
                headers: Object.keys(results[0] || {})
            }));
        },
        error: function (err) {
            console.log(JSON.stringify({ error: err.message }));
        }
    });
}

run();
