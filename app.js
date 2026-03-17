// IMPORTAR FIREBASE
import { db, storage } from "./firebase.js";

import {
  collection, getDocs, query, where, addDoc,
  onSnapshot, orderBy, updateDoc, doc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";


// VARIABLES GLOBALES
let currentUser = null;
let currentUserUID = null;
let lastMessageCount = 0;
let selectedMessageId = null;
let pendingDeleteType = null;
let replyToMessage = null;
let menuOpenTime = 0;


// 🔐 BLOQUEOS BÁSICOS (ANTI CAPTURA / COPIA)
document.addEventListener('keydown', (e) => {
  if (e.key === 'PrintScreen' || e.ctrlKey || e.metaKey) {
    e.preventDefault();
  }
});

document.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
    e.preventDefault();
  }
});

document.addEventListener('dragstart', (e) => e.preventDefault());


// MENU HEADER
window.toggleMenu = function(){
  document.getElementById("menuDropdown").classList.toggle("active");
};

document.addEventListener("click", function(event){
  const menu = document.getElementById("menuDropdown");
  const btn = document.getElementById("menuBtn");
  if(!menu.contains(event.target) && !btn.contains(event.target)){
    menu.classList.remove("active");
  }
});


// LOGIN
window.login = async function(){
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if(!user || !pass) return alert("Completa los campos");

  const q = query(collection(db,"users"),
    where("username","==",user),
    where("password","==",pass));

  const snap = await getDocs(q);

  if(snap.empty){
    alert("Datos incorrectos");
  } else {
    currentUser = user;

    const userData = snap.docs[0].data();
    currentUserUID = userData.uid;
    localStorage.setItem('userUID', userData.uid);

    document.getElementById("loginSection").style.display = "none";
    document.getElementById("chatSection").style.display = "flex";
    document.getElementById("chatFooter").style.display = "flex";
    document.getElementById("menuBtn").style.display = "flex";

    loadMessages();
  }
};


// LOGOUT
window.logout = function(){
  localStorage.removeItem('userUID');
  location.reload();
};


// BORRAR CHAT
window.deleteChatConfirm = function(){
  document.getElementById("confirmTitle").textContent = "Borrar Chat";
  document.getElementById("confirmText").textContent = "¿Eliminar todo?";
  document.getElementById("confirmationModal").classList.add("active");
  pendingDeleteType = "chat";
};

window.closeConfirmation = function(){
  document.getElementById("confirmationModal").classList.remove("active");
};

window.confirmDelete = async function(){
  if(pendingDeleteType === "chat"){
    const snapshot = await getDocs(collection(db,"messages"));
    for(const d of snapshot.docs){
      await deleteDoc(doc(db,"messages",d.id));
    }
  } else if(pendingDeleteType === "message"){
    await deleteDoc(doc(db,"messages",selectedMessageId));
  }
  closeConfirmation();
};


// ENVIAR MENSAJE TEXTO
window.sendMessage = async function(){
  const text = document.getElementById("messageInput").value.trim();
  if(!text) return;

  const data = {
    text,
    username: currentUser,
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

  const uid = localStorage.getItem("userUID");

  const storageRef = ref(storage, `${folder}/${uid}/${Date.now()}_${file.name}`);

  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);

  const data = {
    username: currentUser,
    createdAt: new Date(),
    viewedBy: [],
    type: isVideo ? "video" : "image"
  };

  if(isVideo) data.videoUrl = url;
  else data.imageUrl = url;

  await addDoc(collection(db,"messages"), data);
});


// MODAL MEDIA
window.openMediaModal = async function(id, url, type, username){
  if(username !== currentUser){
    await updateDoc(doc(db,"messages",id), {
      viewedBy:[currentUser]
    });
  }

  const img = document.getElementById("modalImage");
  const vid = document.getElementById("modalVideo");

  if(type==="video"){
    img.style.display="none";
    vid.style.display="block";
    vid.src=url;
    vid.load();
  } else {
    vid.style.display="none";
    img.style.display="block";
    img.src=url;
  }

  document.getElementById("mediaModal").classList.add("active");
};

window.closeMediaModal = function(){
  document.getElementById("mediaModal").classList.remove("active");
  document.getElementById("modalVideo").pause();
};


// RESPUESTAS
function showReplyPreview(msg){
  const preview = document.getElementById("replyPreview");
  const text = document.getElementById("replyText");

  text.textContent = msg.text || "Media";
  preview.style.display = "block";
  replyToMessage = msg;
}

window.cancelReply = function(){
  document.getElementById("replyPreview").style.display = "none";
  replyToMessage = null;
};


// ESCAPE HTML
function escapeHtml(text){
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}


// CARGAR MENSAJES (OPTIMIZADO)
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
      div.className = `message ${data.username===currentUser?"sent":"received"}`;

      let html = `<div class="username">${data.username}</div>`;

      if(data.replyTo){
        html += `<div class="reply-ref">
        <b>↩️ ${data.replyTo.username}</b>
        ${escapeHtml(data.replyTo.text)}
        </div>`;
      }

      if(data.text){
        html += `<div class="message-text">${escapeHtml(data.text)}</div>`;
      }

      if(data.imageUrl){
        html += `<img loading="lazy" src="${data.imageUrl}"
        onclick="openMediaModal('${id}','${data.imageUrl}','image','${data.username}')">`;
      }

      if(data.videoUrl){
        html += `<video onclick="openMediaModal('${id}','${data.videoUrl}','video','${data.username}')">
        <source src="${data.videoUrl}">
        </video>`;
      }

      div.innerHTML = html;
      container.appendChild(div);

      div.addEventListener("contextmenu",(e)=>{
        e.preventDefault();
        selectedMessageId = id;
        pendingDeleteType = "message";
        document.getElementById("confirmationModal").classList.add("active");
      });
    });

    container.scrollTop = container.scrollHeight;
  });
}

