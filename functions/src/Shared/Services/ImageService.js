import {throwError} from '../../Configs/errors.js'
import { admin, db, storage, FieldValue } from '../../Configs/firebaseAdmin.js'



export default class ImageService {

  static #saveImageInDb = async (imageUrl) => {
    try {
      // Check for existing record with unique field
      if (uniqueField) {
        const existingImage = await this.collection
          .where(url, "==",imageUrl)
          .get();

        if (!existingImage.empty) {
        throwError(
            `This image already exists`,
            400
          );
        }
      }
      // Add document to Firestore
      const docRef = await this.collection.add(imageUrl);

      return {success:true, message: 'Image saved successfully'}
    } catch (error) {
      console.error("Create error:", error);
      throw error;
    }
  }

  static #deleteFromStorage = async(imageUrl) => {
      try {
    // Extraer el path del archivo de la URL
    const filePathMatch = imageUrl;

    if (!filePathMatch) {
      throw new Error("URL de imagen no válida");
    }

    // filePath será: "images/1729187488915-autoUnion2.webp"
    const filePath = `images/${filePathMatch[1]}`;
    const file = storage.file(filePath);

    // Verificar si el archivo existe
    const [exists] = await file.exists();
    if (!exists) {
      throw new Error("Imagen no encontrada en Storage");
    }

    // Eliminar el archivo
    await file.delete();
    return {message: "Imagen borrada exitosamente", success: true};
  } catch (error) {
    console.error("Error al eliminar imagen:", error);
    throw error;
  }
  }

  static oldImagesHandler = async(imageUrl, saver = false) => {
    return saver === true ? await this.#saveImageInDb(imageUrl) : await this.#deleteFromStorage(imageUrl)
  }

  static deleteImage = async (data, isId = false) => {
        let documentToDelete;
        if (isId) {
          // Búsqueda por ID
          const docSnapshot = await ImagesSaved.doc(data).get();
          if (!docSnapshot.exists) {
            throwError("Imagen no hallada", 404);
          }
          documentToDelete = docSnapshot.ref;
        } else {
          // Búsqueda por URL
          const querySnapshot = await ImagesSaved.
              where("imageUrl", "==", data)
              .limit(1)
              .get();
          if (querySnapshot.empty) {
            throwError("Imagen no hallada", 404);
          }
          documentToDelete = querySnapshot.docs[0].ref;
        }

        // Eliminar el documento
        await documentToDelete.delete();
        return "Imagen borrada exitosamente";
  }

  static getImages = async () => {
    const snapshot = await ImagesSaved.get();
    // return snapshot.docs
    if (snapshot.empty) {
      return [{id: 1, imageUrl: "NoData"}];
    }
    const imagesData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return imagesData.map((img)=>({id: img.id, imageUrl: img.imageUrl}));
    }
}
