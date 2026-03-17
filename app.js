
// IMPORTAR FIREBASE
import { db, storage, auth } from "./firebase.js";

import {
  collection, addDoc, onSnapshot, orderBy,
  updateDoc, doc, deleteDoc, query
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";


// VARIABLES
let currentUser = null;
let currentUserUID = null;
let lastMessageCount = 0;
let selectedMessageId = null;
let pendingDeleteType = null;
let replyToMessage = null;


// 🔐 AUTH

// LOGIN
window.login = async function(){
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    currentUser = user.email;
    currentUserUID = user.uid;

    startApp();

  } catch (error) {
    alert("Error: " + error.message);
  }
};


// REGISTRO
window.register = async function(){
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Usuario creado correctamente");
  } catch (error) {
    alert("Error: " + error.message);
  }
};


// SESIÓN AUTOMÁTICA
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user.email;
    currentUserUID = user.uid;
    startApp();
  }
});


// LOGOUT
window.logout = function(){
  signOut(auth);
  location.reload();
};


// INICIAR APP
function startApp(){
  document.getElementById("loginSection").style.display = "none";
  document.getElementById("chatSection").style.display = "flex";
  document.getElementById("chatFooter").style.display = "flex";
  document.getElementById("menuBtn").style.display = "flex";

  loadMessages();
}


// ENVIAR MENSAJE TEXTO
window.sendMessage = async function(){
  const text = document.getElementById("messageInput").value.trim();
  if(!text) return;

  const data = {
    text,
    username: currentUser,
    uid: currentUserUID, // 🔥 IMPORTANTE
    createdAt: new Date(),
    type:"text"
  };

  if(replyToMessage){
    data.replyTo = {
      id: replyToMessage.id,
      text: replyToMessage.text || "(media)",
      username: replyToMessage.username
    };
  }

  await addDoc(collection(db,"messages"), data);

  document.getElementById("messageInput").value = "";
  cancelReply();
};


// SUBIR IMAGEN / VIDEO
document.getElementById("fileInput").addEventListener("change", async(e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const isVideo = file.type.startsWith("video/");
  const folder = isVideo ? "chatVideos" : "chatImages";

  const storageRef = ref(storage, `${folder}/${currentUserUID}/${Date.now()}_${file.name}`);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const data = {
    username: currentUser,
    uid: currentUserUID, // 🔥 IMPORTANTE
    createdAt: new Date(),
    viewedBy: [],
    type: isVideo ? "video" : "image"
  };

  if(isVideo) data.videoUrl = url;
  else data.imageUrl = url;

  await addDoc(collection(db,"messages"), data);
});


// BORRAR MENSAJE
window.confirmDelete = async function(){
  if(pendingDeleteType === "message"){
    await deleteDoc(doc(db,"messages",selectedMessageId));
  }
};


// CARGAR MENSAJES
function loadMessages(){
  const q = query(collection(db,"messages"), orderBy("createdAt"));

  onSnapshot(q, (snapshot)=>{
    const container = document.getElementById("messages");

    if(snapshot.size === lastMessageCount) return;
    lastMessageCount = snapshot.size;

    container.innerHTML = "";

    snapshot.forEach(docSnap=>{
      const data = docSnap.data();
      const id = docSnap.id;

      const div = document.createElement("div");
      div.className = `message ${data.uid===currentUserUID?"sent":"received"}`;

      let html = `<div class="username">${data.username}</div>`;

      if(data.text){
        html += `<div class="message-text">${data.text}</div>`;
      }

      if(data.imageUrl){
        html += `<img src="${data.imageUrl}">`;
      }

      if(data.videoUrl){
        html += `<video controls><source src="${data.videoUrl}"></video>`;
      }

      div.innerHTML = html;
      container.appendChild(div);

      div.addEventListener("contextmenu",(e)=>{
        e.preventDefault();
        selectedMessageId = id;
        pendingDeleteType = "message";
      });
    });

    container.scrollTop = container.scrollHeight;
  });
}


// RESPUESTA
function cancelReply(){
  replyToMessage = null;
}

