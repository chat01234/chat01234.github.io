
// IMPORTS FIREBASE (VERSIÓN MODULAR)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
  apiKey: "AIzaSyB8MX9UKhyhatywGhPbpIldBD80wsY38BI",
  authDomain: "chat01234.firebaseapp.com",
  projectId: "chat01234",
  storageBucket: "chat01234.firebasestorage.app",
  messagingSenderId: "861947372030",
  appId: "1:861947372030:web:3f1d0c4709b3d96fe6a0af"
};

// INICIALIZAR FIREBASE
const app = initializeApp(firebaseConfig);

// EXPORTAR SERVICIOS
export const db = getFirestore(app);
export const storage = getStorage(app);

