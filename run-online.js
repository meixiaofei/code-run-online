let compression = require('compression');
let express = require('express');
let app = express();
let process = require('child_process');
let bodyParser = require('body-parser');
let os = require('os');
let fs = require('fs');
let SSE = require('express-sse');
let sse = new SSE(
    'Hello World~'
    , {isSerialized: false, initialEvent: 'sse-connect'}
);

app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

app.all('/', function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get('/sse', sse.init);

app.get('/', function (req, res) {
    res.sendFile('run-online.html', {root: __dirname});
});

app.post('/', function (req, res) {
    let lang = req.body.lang;
    let code = req.body.code;
    let className = req.body.classname;

    let langSuffix = {
        'php': {
            'suf': 'php',
            'cmd': 'php -f {file}'
        },
        'ruby': {
            'suf': 'rb',
            'cmd': 'ruby {file}'
        },
        'python': {
            'suf': 'py',
            'cmd': 'python {file}'
        },
        'python3': {
            'suf': 'py',
            'cmd': 'python3 {file}'
        },
        'java': {
            'suf': 'java',
            'cmd': 'javac {file}; java -cp {path} {className}'
        },
        'c': {
            'suf': 'c',
            'cmd': 'gcc {file} -o {path}runc; {path}runc'
        },
        'cpp': {
            'suf': 'cpp',
            'cmd': 'g++ {file} -o {path}runcpp; {path}runcpp'
        },
        'go': {
            'suf': 'go',
            'cmd': 'go run {file}'
        },
        'perl': {
            'suf': 'pl',
            'cmd': 'perl {file}'
        },
        'perl6': {
            'suf': 'pl',
            'cmd': 'perl6 {file}'
        },
    };


    if (!langSuffix.hasOwnProperty(lang)) {
        sse.send('暂不支持该语言~', 'sse-message');
    }

    let tmpPath = os.tmpdir();
    let file, filename;
    if (lang === 'java') {
        className = className.replace(/^\s+|\s+$/g, '');
        if (className === '') {
            sse.send('没有找着Java类~', 'sse-message');
            return;
        }
        filename = className + '.' + langSuffix[lang]['suf'];
        file = tmpPath + filename;
    } else {
        filename = 'index.' + langSuffix[lang]['suf'];
        file = tmpPath + filename;
    }

    writeFile(file, code);
    let execCmd = langSuffix[lang]['cmd'];
    execCmd = execCmd.replace(/{file}/g, file);
    execCmd = execCmd.replace(/{path}/g, tmpPath);
    execCmd = execCmd.replace(/{className}/g, className);
    execCmd = execCmd.replace(/{filename}/g, filename);

    sse.send('代码已经开始执行啦~', 'sse-message');

    process.exec(execCmd, function (error, stdout, stderr) {
        fs.unlinkSync(file);
        if (error !== null) {
            sse.send('代码执行出错啦~ ' + error, 'sse-message');
        }
        sse.send(stdout, 'sse-result');
    });

    res.end();
});

app.listen(61234, function () {
    console.log('Listen http://127.0.0.1:61234');
});

function writeFile(file, str) {
    fs.writeFile(file, str, function (err) {
        if (err)
            console.log('fail ' + err);
    });
}
