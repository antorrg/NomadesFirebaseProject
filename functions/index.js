import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { onCall } from "firebase-functions/v2/https";
import logger from "firebase-functions/logger";
import { db, storage } from "./src/Configs/firebaseAdmin.js";

setGlobalOptions({ maxInstances: 10 });

// 🌐 HTTP endpoint
export const helloWorld = onRequest((req, res) => {
  logger.info("Hello from Firebase!");
  res.send("Hola desde Firebase Functions!");
});

// // ☁️ Callable Function (desde cliente con Firebase SDK)
// export const addMessage = onCall(async (request) => {
//   const { text } = request.data;
//   const ref = await db.collection("landing").add({ text, createdAt: new Date() });
//   return { id: ref.id };
// });

// // ☁️ Otra función de ejemplo con Firestore
// export const getMessages = onCall(async () => {
//   const snapshot = await db.collection("messages").orderBy("createdAt", "desc").limit(5).get();
//   return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
// });
