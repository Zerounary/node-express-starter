var CryptoJS = require("crypto-js");

const key = 'sec123'



const text = 'my message中文'

console.log('发送(原文): ', text);

var ciphertext = CryptoJS.AES.encrypt(text, key).toString();

console.log('发送(加密): ', ciphertext);

var bytes  = CryptoJS.AES.decrypt(ciphertext, key);
var originalText = bytes.toString(CryptoJS.enc.Utf8);

console.log('接收(解密): ', originalText);

/**
 * 

    发送(原文):  my message
    发送(加密):  U2FsdGVkX1+lef6rcQziRcKkaVp4bGi1TXdvHseIafQ=
    接收(解密):  my message

 */