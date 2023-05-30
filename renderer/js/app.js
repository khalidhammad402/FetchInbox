const {ipcRenderer, dialog} = require("electron")

let fromDate = document.getElementById('from-date'),
    toDate = document.getElementById('to-date'),
    subject = document.getElementById('subject'),
    fileName = document.getElementById('file-name'),
    searchForm = document.getElementById('search-form'),
    searchButton = document.getElementById('search-button'),
    subjectOption = document.getElementById('subject-option'),
    fileOption = document.getElementById('file-option'),
    hiddenMenu = document.getElementById('hidden-menu'),
    filePath = document.getElementById('file-path'),
    downloadButton = document.getElementById('download-button'),
    excelButton = document.getElementById('excel-button'),
    folderInput = document.getElementById('folder-input')

const today = new Date();   
const todayISO = today.toISOString().split('T')[0];
fromDate.setAttribute('max', todayISO);
toDate.setAttribute('max', todayISO);

// Toggling Buttons
const toggleSearchButton = () => {
    if (searchButton.disabled === true) {
        searchButton.disabled = false
        searchButton.style.opacity = 1
        searchButton.innerText = 'Search'
    } else {
        searchButton.disabled = true
        searchButton.style.opacity = 0.5
        searchButton.innerText = 'Searching...'
    }
}
const toggleDownloadButton = () => {
    if (downloadButton.disabled === true) {
        downloadButton.disabled = false
        excelButton.disabled = false
        searchButton.disabled = false
        downloadButton.style.opacity = 1
        downloadButton.innerText = 'Download'
    } else {
        downloadButton.disabled = true
        downloadButton.style.opacity = 0.5
        downloadButton.innerText = 'Downloading...'
        excelButton.disabled = true;
        searchButton.disabled = true
    }
}
const toggleExcelButton = () => {
    if (excelButton.disabled === true) {
        excelButton.disabled = false
        searchButton.disabled = false
        downloadButton.disabled = false
        excelButton.style.opacity = 1
        excelButton.innerText = 'Excel'
    } else {
        excelButton.disabled = true
        searchButton.disabled = true
        downloadButton.disabled = true
        excelButton.style.opacity = 0.5
        excelButton.innerText = 'Processing...'
    }
}

// ipc MEssaging
ipcRenderer.on('files-downloaded', (event, numberOfFiles)=>{
    toggleSearchButton()
    if(numberOfFiles){
        alert(numberOfFiles+' files found!')
        hiddenMenu.style.display = 'block';
    } else {
        alert('No files found!')
    }
})
ipcRenderer.on('no-emails', (event, args)=>{
    toggleSearchButton()
    alert('No files found!')
})
ipcRenderer.on('filepath-selected', (event, filepath)=>{
    if(!filepath) filepath = "";
    filePath.value = filepath;
})
ipcRenderer.on('download-completed', (event)=>{
    toggleDownloadButton();
    alert("Download Completed!")
})
ipcRenderer.on('download-failed', (event)=>{
    toggleDownloadButton();
    alert("Download Failed!")
})

// Event Listeners

// Search: Submit
searchForm.addEventListener('submit', event=> {
    event.preventDefault(); 
    let invalid = false;
    if(fromDate.value.trim() === '' || toDate.value.trim() === ''){
        invalid = true;
    }
    if ((subjectOption.value.trim() === 'specific' || subjectOption.value.trim() === 'pattern') && (fromDate.value.trim() === '' || toDate.value.trim() === '' || subject.value.trim() === '')) {
        invalid = true;
    }
    if ((fileOption.value.trim() === 'specific' || fileOption.value.trim() === 'pattern') && (fromDate.value.trim() === '' || toDate.value.trim() === '' || fileName.value.trim() === '')) {
        invalid = true;
    }
    if(invalid) {
        alert('Please fill in all required fields.');
        return
    }
    let imapQuery = {
        fromDate: fromDate.value,
        toDate: toDate.value,
        subject: subject.value,
        fileName: fileName.value,
        subjectOption: subjectOption.value,
        fileOption: fileOption.value
    }
    toggleSearchButton()
    hiddenMenu.style.display = 'none';
    ipcRenderer.send('imap-query', imapQuery)
})

// Download 
downloadButton.addEventListener('click', (event)=>{
    let invalid = false;
    if(fromDate.value.trim() === '' || toDate.value.trim() === ''){
        invalid = true;
    }
    if ((subjectOption.value.trim() === 'specific' || subjectOption.value.trim() === 'pattern') && (fromDate.value.trim() === '' || toDate.value.trim() === '' || subject.value.trim() === '')) {
        invalid = true;
    }
    if ((fileOption.value.trim() === 'specific' || fileOption.value.trim() === 'pattern') && (fromDate.value.trim() === '' || toDate.value.trim() === '' || fileName.value.trim() === '')) {
        invalid = true;
    }
    if(invalid) {
        alert('Please fill in all required fields.');
        return
    }
    toggleDownloadButton();
    downloadDetails = {
        fromDate: fromDate.value,
        toDate: toDate.value
    }
    ipcRenderer.send('download-query', downloadDetails);
})

// Excel
excelButton.addEventListener('click', (event)=>{
    let invalid = false;
    if(fromDate.value.trim() === '' || toDate.value.trim() === ''){
        invalid = true;
    }
    if ((subjectOption.value.trim() === 'specific' || subjectOption.value.trim() === 'pattern') && (fromDate.value.trim() === '' || toDate.value.trim() === '' || subject.value.trim() === '')) {
        invalid = true;
    }
    if ((fileOption.value.trim() === 'specific' || fileOption.value.trim() === 'pattern') && (fromDate.value.trim() === '' || toDate.value.trim() === '' || fileName.value.trim() === '')) {
        invalid = true;
    }
    if(invalid) {
        alert('Please fill in all required fields.');
        return
    }
    toggleExcelButton();
    ipcRenderer.send('excel-query', filePath.value)
})

// subject-option
subjectOption.addEventListener('change', event=> {
    hiddenMenu.style.display = 'none';
    if(subjectOption.value === 'all' || subjectOption.value === 'applications'){
        subject.disabled = true;
        subject.value = ''
        subject.style.cursor = 'not-allowed'
        subject.style.backgroundColor = 'rgb(223, 220, 220)';
    } else {
        subject.style.backgroundColor = 'whitesmoke';
        subject.disabled = false;
        subject.style.cursor = 'text'
        subject.focus()
    }
})

// file-option
fileOption.addEventListener('change', event=> {
    hiddenMenu.style.display = 'none';
    if(fileOption.value === 'all' || fileOption.value === 'applications'){
        fileName.disabled = true;
        fileName.value = ''
        fileName.style.cursor = 'not-allowed'
        fileName.style.backgroundColor = 'rgb(223, 220, 220)';
    } else {
        fileName.style.backgroundColor = 'whitesmoke';
        fileName.disabled = false;
        fileName.style.cursor = 'text'
        fileName.focus();
    }
})

// fromDate
fromDate.addEventListener('change', event=>{
    hiddenMenu.style.display = 'none';
})

// toDate
toDate.addEventListener('change', event=>{
    hiddenMenu.style.display = 'none';
})

// Filepath
filePath.addEventListener('focus', async event=>{
    event.preventDefault();
    ipcRenderer.send('filepath-clicked')
    filePath.blur()
})