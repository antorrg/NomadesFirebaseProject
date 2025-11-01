import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { FieldValue } from "firebase-admin/firestore";

const dirname = path.resolve();

const serviceAccountPath = path.join(dirname, "../proyectopreactSdk2.json");
console.log(serviceAccountPath)
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "proyectopreact.appspot.com",
  });
}

const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });
const storage = admin.storage().bucket();

export { admin, db, storage, FieldValue };
