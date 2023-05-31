const {app, BrowserWindow, ipcMain, dialog} = require("electron")
const fs = require("fs")
const Imap = require("imap")
const {simpleParser} = require('mailparser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// Global variables and configurations
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
let mainWindow, imap
const desktopPath = app.getPath('desktop')
let downloadPath
let searchResults = []
const year = new Date().getFullYear()

// Some global variables for regex operation of application name
const degrees = [/MTECH/, /M.TECH/, /BTECH/, /B.TECH/, /MSC/, /BSC/]
const branch = [/CSE/, /IT/, /ECE/, /EEE/, /MECH/]
const duration = /[0-9]{2}WEEKS/
const doj = /(\d)([A-Z]{3})(\d{4})/
const regexSubject = /[A-Z]_INTERNSHIP_APPLICATION_[0-9]{10}/

// Handling alerts
ipcMain.on('alert', (event, message)=>{
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        message: message,
        buttons: ['OK']
    })
})

// filepath clicked
ipcMain.on('filepath-clicked', async (event)=>{
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
    });
    const selectedFolder = result.filePaths[0];
    downloadPath = selectedFolder;
    event.reply('filepath-selected', selectedFolder);
})

// Handling search button of main app OK
ipcMain.on('imap-query', (event, imapQuery)=>{
    searchResults = []
    function openInbox(cb) {
        imap.openBox('INBOX', true, cb);
    }
    openInbox(function(err, box) {
        if (err) throw err;
        const searchCriteria = [['SINCE', imapQuery.fromDate],['OR', ['ON', imapQuery.toDate], ['BEFORE', imapQuery.toDate]]];
        if(imapQuery.subjectOption === 'specific'){
            searchCriteria.push(['SUBJECT', imapQuery.subject]);
        } 
        imap.search(searchCriteria, async (err, results) => {
            if(err) throw(err);
            if(results.length){
                const f = await imap.fetch(results, {bodies: ''});
                f.on('message',  msg => {
                    msg.on('body', stream => {
                        simpleParser(stream, async (err, parsed) => {
                            if (err) throw err;
                            for (const attachment of parsed.attachments) {
                                let fileType = /pdf/
                                let validFile = false
                                if(fileType.test(attachment.contentType)) validFile = true
                                fileType = /docx/
                                if(fileType.test(attachment.contentType)) validFile = true
                                if(parsed.subject) parsed.subject = parsed.subject.toUpperCase()
                                if(validFile){
                                    let fileName = attachment.filename.toUpperCase();
                                    // Subject : All/Specific
                                    if(imapQuery.subjectOption === 'all' || imapQuery.subjectOption === 'specific'){
                                        // fileName : All
                                        if(imapQuery.fileOption === 'all'){
                                            searchResults.push({
                                                filename: fileName,
                                                content: attachment.content
                                            });
                                        // fileName : specific
                                        } else if(imapQuery.fileOption === 'specific'){
                                            if(imapQuery.fileName === fileName){
                                                searchResults.push({
                                                    filename: fileName,
                                                    content: attachment.content
                                                });
                                            }
                                        // fileName: pattern
                                        } else if(imapQuery.fileOption === 'pattern'){
                                            // perform regex operations here
                                            let regexFile = RegExp(imapQuery.fileName)
                                            if(regexFile.test(fileName)){
                                                searchResults.push({
                                                    filename: fileName,
                                                    content: attachment.content
                                                });
                                            }
                                        // fileName : application
                                        } else {
                                            // perform regex operation with for applications only
                                            let matchIndex = 0;
                                                let applicant = {
                                                    filename: fileName,
                                                    content: attachment.content,
                                                    name: '',
                                                    degree: '',
                                                    discipline: '',
                                                    weeks: '',
                                                    doj: ''
                                                }
                                                let name = fileName.match(/^\b([A-Z]+)/);
                                                if(name){
                                                    applicant.name = name[1];
                                                }
                                                for(let i=0; i<degrees.length; i++){
                                                    if(degrees[i].test(fileName)){
                                                        matchIndex += 0.25;
                                                        applicant.degree = degrees[i].toString().slice(1, -1);
                                                        break;
                                                    }
                                                }
                                                for(let i=0; i<branch.length; i++){
                                                    if(branch[i].test(fileName)){
                                                        matchIndex += 0.25;
                                                        applicant.discipline = branch[i].toString().slice(1, -1);
                                                        break;
                                                    }
                                                }
                                                let weekMatch = fileName.match(duration);
                                                if(weekMatch){
                                                    console.log(weekMatch)
                                                    applicant.weeks = weekMatch[0];
                                                    matchIndex += 0.25;
                                                }
                                                let matches = fileName.match(doj)
                                                if(matches && (matches[3]==year || matches[3]==year+1)){
                                                    applicant.doj = matches[1]+matches[2]+matches[3];
                                                    matchIndex += 0.25;
                                                }
                                                if(matchIndex >= 0.75){
                                                    searchResults.push(applicant);
                                                }
                                        }
                                    // Subject: Pattern
                                    } else if(imapQuery.subjectOption === 'pattern'){
                                        let regexSubject = RegExp(imapQuery.subject)
                                        if(regexSubject.test(parsed.subject)){
                                            // fileName : All
                                            if(imapQuery.fileOption === 'all'){
                                                searchResults.push({
                                                    filename: fileName,
                                                    content: attachment.content
                                                });
                                            // fileName : Specific
                                            } else if(imapQuery.fileOption === 'specific'){
                                                if(imapQuery.fileName === fileName){
                                                    searchResults.push({
                                                        filename: fileName,
                                                        content: attachment.content
                                                    });
                                                }
                                            // fileName : pattern
                                            } else if(imapQuery.fileOption === 'pattern'){
                                                // perform regex operations here
                                                let regexFile = RegExp(imapQuery.fileName)
                                                if(regexFile.test(fileName)){
                                                    searchResults.push({
                                                        filename: fileName,
                                                        content: attachment.content
                                                    });
                                                }
                                            // fileName : application
                                            } else {
                                                // perform regex operation with for applications only
                                                let matchIndex = 0;
                                                let applicant = {
                                                    filename: fileName,
                                                    content: attachment.content,
                                                    name: '',
                                                    degree: '',
                                                    discipline: '',
                                                    weeks: '',
                                                    doj: ''
                                                }
                                                let name = fileName.match(/^\b([A-Z]+)/);
                                                if(name){
                                                    applicant.name = name[1];
                                                }
                                                for(let i=0; i<degrees.length; i++){
                                                    if(degrees[i].test(fileName)){
                                                        matchIndex += 0.25;
                                                        applicant.degree = degrees[i].toString().slice(1, -1);
                                                        break;
                                                    }
                                                }
                                                for(let i=0; i<branch.length; i++){
                                                    if(branch[i].test(fileName)){
                                                        matchIndex += 0.25;
                                                        applicant.discipline = branch[i].toString().slice(1, -1);
                                                        break;
                                                    }
                                                }
                                                let weekMatch = fileName.match(duration);
                                                if(weekMatch){
                                                    console.log(weekMatch)
                                                    applicant.weeks = weekMatch[0];
                                                    matchIndex += 0.25;
                                                }
                                                let matches = fileName.match(doj)
                                                if(matches && (matches[3]==year || matches[3]==year+1)){
                                                    applicant.doj = matches[1]+matches[2]+matches[3];
                                                    matchIndex += 0.25;
                                                }
                                                if(matchIndex >= 0.75){
                                                    searchResults.push(applicant);
                                                }
                                            }
                                        }
                                    // Subject : Application
                                    } else {
                                        if(regexSubject.test(parsed.subject)){
                                            // fileName : All
                                            if(imapQuery.fileOption === 'all'){
                                                let applicantName = fileName.match(/^\b([A-Z]+)/);
                                                searchResults.push({
                                                    name: applicantName[1],
                                                    phone:  parsed.subject.substring(parsed.subject.length - 10),
                                                    filename: fileName,
                                                    content: attachment.content
                                                });
                                            // fileName : specific
                                            } else if(imapQuery.fileOption === 'specific'){
                                                if(imapQuery.fileName === fileName){
                                                    let applicantName = fileName.match(/^\b([A-Z]+)/);
                                                    searchResults.push({
                                                        name: applicantName[1],
                                                        phone:  parsed.subject.substring(parsed.subject.length - 10),
                                                        filename: fileName,
                                                        content: attachment.content
                                                    });
                                                }
                                            // fileName : pattern
                                            } else if(imapQuery.fileOption === 'pattern'){
                                                // perform regex operations here
                                                let regexFile = RegExp(imapQuery.fileName)
                                                if(regexFile.test(fileName)){
                                                    let applicantName = fileName.match(/^\b([A-Z]+)/);
                                                    searchResults.push({
                                                        name: applicantName[1],
                                                        phone:  parsed.subject.substring(parsed.subject.length - 10),
                                                        filename: fileName,
                                                        content: attachment.content
                                                    });
                                                }
                                            // fileName : Application
                                            } else {
                                                // perform regex operation for applications only
                                                let matchIndex = 0;
                                                let applicant = {
                                                    filename: fileName,
                                                    content: attachment.content,
                                                    name: '',
                                                    phone: parsed.subject.substring(parsed.subject.length - 10),
                                                    degree: '',
                                                    discipline: '',
                                                    weeks: '',
                                                    doj: ''
                                                }
                                                let name = fileName.match(/^\b([A-Z]+)/);
                                                if(name){
                                                    applicant.name = name[1];
                                                }
                                                for(let i=0; i<degrees.length; i++){
                                                    if(degrees[i].test(fileName)){
                                                        matchIndex += 0.25;
                                                        applicant.degree = degrees[i].toString().slice(1, -1);
                                                        break;
                                                    }
                                                }
                                                for(let i=0; i<branch.length; i++){
                                                    if(branch[i].test(fileName)){
                                                        matchIndex += 0.25;
                                                        applicant.discipline = branch[i].toString().slice(1, -1);
                                                        break;
                                                    }
                                                }
                                                let weekMatch = fileName.match(duration);
                                                if(weekMatch){
                                                    console.log(weekMatch)
                                                    applicant.weeks = weekMatch[0];
                                                    matchIndex += 0.25;
                                                }
                                                let matches = fileName.match(doj)
                                                if(matches && (matches[3]==year || matches[3]==year+1)){
                                                    applicant.doj = matches[1]+matches[2]+matches[3];
                                                    matchIndex += 0.25;
                                                }
                                                if(matchIndex >= 0.75){
                                                    searchResults.push(applicant);
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    });
                });
                f.once('error', ex => {
                    return Promise.reject(ex);
                });
                f.once('end', () => {
                    // Debug this
                    setTimeout(()=>{
                        event.reply('files-downloaded', searchResults.length)
                    }, 3000);
                });
            } else {
                event.reply('no-emails')
            }
        });
    })
});

//Handling download button of the main app
ipcMain.on('download-query', (event, downloadDetails)=>{
    let currentpath = "";
    if(!downloadPath) downloadPath = desktopPath;
    let date = new Date();
    let today = String(date.getFullYear())+'-';
    today += String(date.getMonth()).padStart(2, '0')+'-';
    today += String(date.getDate()).padStart(2, '0')+'_(Time';
    today += String(date.getHours())+'-';
    today += String(date.getMinutes())+'-';
    today += String(date.getSeconds());
    currentpath = downloadPath + '/'+today+')_from'+downloadDetails.fromDate+'_to'+downloadDetails.toDate;
    try {
        if(searchResults.length) fs.mkdirSync(currentpath);
        for(let i=0; i<searchResults.length; i++){
            fs.writeFileSync(currentpath+'/'+searchResults[i].filename, searchResults[i].content)
        }
        event.reply('download-completed');
    } catch (err) {
        console.log(err);
        if(fs.existsSync(currentpath)) fs.rmdirSync(currentpath)
        event.reply('download-failed');
    }
})

// Handling excel button query of main app
ipcMain.on('excel-query', (event, excelDetails)=>{
    let currentpath = "";
    if(!downloadPath) downloadPath = desktopPath;
    let date = new Date();
    let today = String(date.getFullYear())+'-';
    today += String(date.getMonth()).padStart(2, '0')+'-';
    today += String(date.getDate()).padStart(2, '0')+'_(Time';
    today += String(date.getHours())+'-';
    today += String(date.getMinutes())+'-';
    today += String(date.getSeconds());
    currentpath = downloadPath + '/'+today+')_from'+excelDetails.fromDate+'_to'+excelDetails.toDate+'.csv';
    try {     
        let data = []
        let csvWriter
        if(excelDetails.subjectOption==='all' || excelDetails.subjectOption==='specific' || excelDetails.subjectOption==='pattern'){
            if(excelDetails.fileOption==='all' || excelDetails.fileOption==='specifc' || excelDetails.fileOption==='pattern'){
                for(let i=0; i<searchResults.length; i++){
                    data.push({
                        sr: i+1,
                        name: searchResults[i].filename
                    })
                }
                csvWriter = createCsvWriter({
                    path: currentpath,
                    header: [
                      { id: 'sr', title: 'Serial no.' },
                      { id: 'name', title: 'Name' }
                    ]
                });
            } else {
                for(let i=0; i<searchResults.length; i++){
                    data.push({
                        sr: i+1,
                        name: searchResults[i].name,
                        degree: searchResults[i].degree,
                        discipline: searchResults[i].discipline,
                        weeks: searchResults[i].weeks,
                        doj: searchResults[i].doj
                    })
                }
                csvWriter = createCsvWriter({
                    path: currentpath,
                    header: [
                      { id: 'sr', title: 'Serial no.' },
                      { id: 'name', title: 'Name' },
                      { id: 'degree', title: 'Degree' },
                      { id: 'discipline', title: 'Discipline' },
                      { id: 'weeks', title: 'Duration'},
                      { id: 'doj', title: 'Date of joining'}
                    ]
                });
            }
        } else {
            if(excelDetails.fileOption==='all' || excelDetails.fileOption==='specifc' || excelDetails.fileOption==='pattern'){
                for(let i=0; i<searchResults.length; i++){
                    data.push({
                        sr: i+1,
                        name: searchResults[i].name,
                        phone: searchResults[i].phone,
                        filename: searchResults[i].filename
                    })
                }
                csvWriter = createCsvWriter({
                    path: currentpath,
                    header: [
                      { id: 'sr', title: 'Serial no.' },
                      { id: 'name', title: 'Name' },
                      { id: 'phone', title: 'Phone no.'},
                      { id: 'filename', title: 'Filename' }
                    ]
                });
            } else {
                for(let i=0; i<searchResults.length; i++){
                    data.push({
                        sr: i+1,
                        name: searchResults[i].name,
                        phone: searchResults[i].phone,
                        degree: searchResults[i].degree,
                        discipline: searchResults[i].discipline,
                        weeks: searchResults[i].weeks,
                        doj: searchResults[i].doj
                    })
                }
                csvWriter = createCsvWriter({
                    path: currentpath,
                    header: [
                      { id: 'sr', title: 'Serial no.' },
                      { id: 'name', title: 'Name' },
                      { id: 'phone', title: 'Phone no.'},
                      { id: 'degree', title: 'Degree' },
                      { id: 'discipline', title: 'Discipline' },
                      { id: 'weeks', title: 'Duration'},
                      { id: 'doj', title: 'Date of joining'}
                    ]
                });
            }
        }
        console.log(data)
        csvWriter.writeRecords(data)
            .then(() => event.reply('excel-completed'))
            .catch((error) => {
                console.log(error);
                event.reply('excel-failed')
            });
    } catch (err) {
        console.log(err)
        event.reply('excel-failed');
    }
})

// Handling login into the application
ipcMain.on('login-credentials', (event, user)=> {
    imap = new Imap({
        user: user.email,
        password: user.password,
        host: user.domain,
        port: '993',
        tls: true
    });
    imap.once('ready', function() {
        mainWindow.loadFile('renderer/app.html')
    });
       
    imap.once('error', function(err) {
        dialog.showMessageBox(mainWindow, {
            message: "Invalid Credentials\n \nPlease try again",
        })
        imap = null
        event.reply("login-failed")
    });
    imap.connect();
})

function createWindow(){
    mainWindow = new BrowserWindow({
        width: 900, height: 670,
        minWidth: 900, maxWidth: 900, minHeight: 650, maxHeight: 650,
        maximizable: false,
        webPreferences: {
            contextIsolation: false,
            nodeIntegration: true
        }
    })

    mainWindow.loadFile('renderer/login.html')
    // mainWindow.webContents.openDevTools()
    mainWindow.on('closed', ()=>{
        mainWindow = null
    })
}

app.on('ready', createWindow)

app.on('window-all-closed', ()=>{
    if(process.platform != 'darwin') app.quit();
})

app.on('activate', ()=> {
    if(mainWindow == null) createWindow()
})