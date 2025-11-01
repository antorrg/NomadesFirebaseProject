import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { throwError } from '../../Configs/errors.js';

// Asegúrate de que la app de Firebase esté inicializada una sola vez.
// Esto es necesario para usar el SDK Admin.
initializeApp();


const db = getFirestore();

export class BaseService {
    /**
     * @param {string} collectionName - Nombre de la colección (ej: 'products', 'users').
     * @param {boolean} useImage - Parametro para activar la eliminacion de imagenes antiguas
     * @param {string} nameImage - Nombre de imagen en la coleccion (ej: 'image', 'picture')
     * @param {function } ImageService - Clase estatica con metodos de gestion de imagenes (oldImagesHandler, deleteImage)
     */
  constructor(collectionName, useImage = false, nameImage, ImageService=null) {
    this.collection = db.collection(collectionName);
    this.collectionName = collectionName;
    this.useImage = useImage;
    this.nameImage = nameImage;
    this.ImageService = ImageService;

    // ✅ Validar si ImageService es una clase con los métodos esperados
    const validService = (
      ImageService &&
      typeof ImageService === 'function' && // clase o función
      typeof ImageService.oldImagesHandler === 'function' &&
      typeof ImageService.deleteImage === 'function'
    );

    this.useImage = useImage && validService;
  }
  async handleImageDeletion(imageUrl, option) {
    if (this.useImage && imageUrl.trim()) {
      // Implement your Firebase image deletion logic here
      // This might involve using Firebase Storage
      await this.ImageService.oldImagesHandler(imageUrl, option);
    }
  }
  async handleImageStored(imageUrl) {
    await this.ImageService.deleteImage(imageUrl, false);
  }

  async create(data, uniqueField = null, useImg = false) {
    try {
      // Check for existing record with unique field
      if (uniqueField) {
        const existingQuery = await this.collection
          .where(uniqueField, "==", data[uniqueField])
          .where("deletedAt", "==", null)
          .get();

        if (!existingQuery.empty) {
        throwError(
            `This ${this.collectionName} ${uniqueField} already exists`,
            400
          );
        }
      }
      useImg ? await this.handleImageStored(data[this.nameImage]) : null;

      // Add timestamp and deletedAt field
      const newDocData = {
        ...data,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        deletedAt: null,
      };

      // Add document to Firestore
      const docRef = await this.collection.add(newDocData);

      return { id: docRef.id, ...newDocData }
    } catch (error) {
      console.error("Create error:", error);
      throw error;
    }
  }

  async getAll() {
    try {
      // Query for non-deleted documents
      const snapshot = await this.collection
        .where("deletedAt", "==", null)
        .get();

      if (snapshot.empty) { throwError(
              `The ${this.collectionName} collection is empty`,
              404
            );
      }

      // Convert snapshot to array of documents with ID
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      console.log(data);

      return data
    } catch (error) {
      console.error("GetAll error:", error);
      throw error;
    }
  }

  async getById(id) {
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists || doc.data().deletedAt !== null) {
        throwError(`${this.collectionName} not found`, 404);
      }

      const data = {
        id: doc.id,
        ...doc.data(),
      };

      return data
    } catch (error) {
      console.error("GetById error:", error);
      throw error;
    }
  }

  async update(id, newData, useImg=false, saver=false) {
    let imageUrl2 = "";
    let imageUrl1 = ""
    let handleImages = false;
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists || doc.data().deletedAt !== null) {
        throwError(`${this.collectionName} not found`, 404);
      }

      // Handle image update if applicable
      if (
        this.useImage &&
        doc.data()[this.nameImage]&&
        doc.data()[this.nameImage]!== newData[this.nameImage]
      ) {
        imageUrl2 = doc.data()[this.nameImage];
        handleImages = true;
        if (useImg===true) {
            imageUrl1 = newData[this.nameImage]
        }
      }

      // Prepare update data
      const updateData = {
        ...newData,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Update document
      await docRef.update(updateData);

      // Handle image deletion
      if (handleImages) {
        await this.handleImageDeletion(imageUrl2, saver);
        if(useImg){
          await this.handleImageStored(imageUrl1)
        }
      }


      // Fetch and return updated document
      const updatedDoc = await docRef.get();
      const upData = {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      };

      return upData
    } catch (error) {
      console.error("Update error:", error);
      throw error;
    }
  }

  async delete(id) {
    let imageUrl = "";
    try {
      const docRef = this.collection.doc(id);
      const doc = await docRef.get();

      if (!doc.exists || doc.data().deletedAt !== null) {
        throwError(`${this.collectionName} not found`, 404);
      }

      // Handle image if applicable
      if (this.useImage) {
        imageUrl = doc.data()[this.nameImage] || "";
      }

    
        await docRef.delete();
        await this.handleImageDeletion(imageUrl, false);

      return `${this.collectionName} deleted successfully`;
    } catch (error) {
      console.error("Delete error:", error);
      throw error;
    }
  }
    
}


// export class BaseService {
//     /**
//      * @param {string} collectionName - Nombre de la colección (ej: 'products', 'users').
//      * @param {boolean} useImage - Parametro para activar la eliminacion de imagenes antiguas
//      * @param {function} imageFunction - Funcion de eliminacion de imagenes 
//      */
//     constructor(collectionName, useImage, imageFunction) {
//         this.collection = db.collection(collectionName);
//         this.useImage = useImage;
//         this.imageFunction = imageFunction
//     }

//     /**
//      * Crea un nuevo documento en la colección.
//      * @param {Object} data - Datos del documento a crear.
//      * @returns {Promise<Object>} El documento creado con su ID.
//      */
//     async create(data) {
//         try {
//             const docRef = await this.collection.add({
//                 ...data,
//                 createdAt: FieldValue.serverTimestamp(), // Añade marca de tiempo de creación
//                 updatedAt: FieldValue.serverTimestamp()  // Añade marca de tiempo de actualización
//             });
//             return { id: docRef.id, ...data };
//         } catch (error) {
//             console.error(`Error al crear en ${this.collection.id}:`, error);
//             // Re-lanza un error genérico para no exponer detalles internos
//             throw new Error(`Fallo en el servicio: No se pudo crear el registro.`);
//         }
//     }

//     /**
//      * Lee un documento por su ID.
//      */
//     async getById(id) {
//         // ... (Implementación de lectura)
//     }
//     /**
//      * Retorna un array de documentos.
//      */
//     async getAll(){

//     }
//     /**
//      * Actualiza un documento por su ID.
//      */
//     async update(id, data) {
//         // ... (Implementación de actualización)
//     }
//       /**
//      * Elimina un documento por su ID.
//      */
//     async delete(id){}
    
// }