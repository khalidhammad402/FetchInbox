const {ipcRenderer} = require("electron")

let domain = document.getElementById('user-domain'),
    email = document.getElementById('user-email'),
    password = document.getElementById('user-password')
    loginButton = document.getElementById('login-button');
    loginForm = document.getElementById('login-form')

const toggleModalButtons = () => {
    // Check state of buttons
    if (loginButton.disabled === true) {
        loginButton.disabled = false
        loginButton.style.opacity = 1
        loginButton.innerText = 'Login'
    } else {
        loginButton.disabled = true
        loginButton.style.opacity = 0.5
        loginButton.innerText = 'Checking your credentials...'
    }
}

ipcRenderer.on('login-failed', (event, args)=>{
    toggleModalButtons()
    email.style.value = ''
    password.style.value = ''
})

loginForm.addEventListener('submit', event=> {
    event.preventDefault(); 
    if (domain.value.trim() === '' || email.value.trim() === '' || password.value.trim() === '') {
        alert('Please fill in all required fields.');
    }
    let user = {
        domain: domain.value,
        email: email.value,
        password: password.value
    }
    toggleModalButtons()
    ipcRenderer.send("login-credentials", user)
})