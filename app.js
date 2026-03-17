import { db, storage, auth } from "./firebase.js";

import {
  collection, addDoc, onSnapshot, orderBy,
  doc, deleteDoc, query
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

let currentUser = null;
let currentUserUID = null;
let selectedMessageId = null;
let pendingDeleteType = null;

// LOGIN
window.login = async function(){
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    currentUser = userCredential.user.email;
    currentUserUID = userCredential.user.uid;
    startApp();
  } catch (e) {
    alert(e.message);
  }
};

// REGISTRO
window.register = async function(){
  const email = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Cuenta creada");
  } catch (e) {
    alert(e.message);
  }
};

// SESIÓN
onAuthStateChanged(auth, (user)=>{
  if(user){
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
  document.getElementById("menuBtn").style.display = "block";
  loadMessages();
}

// ENVIAR MENSAJE
window.sendMessage = async function(){
  const text = document.getElementById("messageInput").value.trim();
  if(!text) return;

  await addDoc(collection(db,"messages"), {
    text: text,
    username: currentUser,
    uid: currentUserUID,
    createdAt: new Date()
  });

  document.getElementById("messageInput").value = "";
};

// SUBIR ARCHIVO (SIN $)
document.getElementById("fileInput").addEventListener("change", async(e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const folder = file.type.startsWith("video/") ? "chatVideos" : "chatImages";

  const path = folder + "/" + currentUserUID + "/" + Date.now() + "_" + file.name;

  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const data = {
    username: currentUser,
    uid: currentUserUID,
    createdAt: new Date()
  };

  if(file.type.startsWith("video/")){
    data.videoUrl = url;
  } else {
    data.imageUrl = url;
  }

  await addDoc(collection(db,"messages"), data);
});

// CARGAR MENSAJES
function loadMessages(){
  const q = query(collection(db,"messages"), orderBy("createdAt"));

  onSnapshot(q, (snapshot)=>{
    const container = document.getElementById("messages");
    container.innerHTML = "";

    snapshot.forEach(docSnap=>{
      const data = docSnap.data();

      const div = document.createElement("div");
      div.className = data.uid === currentUserUID ? "message sent" : "message received";

      let html = "<b>" + data.username + "</b><br>";

      if(data.text){
        html += data.text;
      }

      if(data.imageUrl){
        html += "<br><img src='" + data.imageUrl + "'>";
      }

      if(data.videoUrl){
        html += "<br><video controls src='" + data.videoUrl + "'></video>";
      }

      div.innerHTML = html;
      container.appendChild(div);
    });
  });
}

// MENU
window.toggleMenu = function(){
  const menu = document.getElementById("menuDropdown");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
};

window.deleteChatConfirm = function(){
  alert("Próximamente");
};

